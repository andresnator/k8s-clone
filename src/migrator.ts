import * as k8s from '@kubernetes/client-node';
import { K8sClient } from './k8s';
import { UI } from './ui';
import { spawn } from 'child_process';

export class Migrator {
    private k8sClient: K8sClient;
    private ui: UI;

    constructor(k8sClient: K8sClient, ui: UI) {
        this.k8sClient = k8sClient;
        this.ui = ui;
    }

    private cleanMetadata(obj: any, targetNamespace: string) {
        if (!obj.metadata) obj.metadata = {};

        // Keep name, labels, annotations (maybe filter some system ones)
        const newMeta: any = {
            name: obj.metadata.name,
            namespace: targetNamespace,
            labels: obj.metadata.labels,
            annotations: obj.metadata.annotations,
        };

        // Remove system specific fields
        delete newMeta.uid;
        delete newMeta.resourceVersion;
        delete newMeta.creationTimestamp;
        delete newMeta.selfLink;
        delete newMeta.generation;
        delete newMeta.ownerReferences;
        delete newMeta.managedFields;

        // Clean status
        delete obj.status;

        // Specific cleanups
        if (obj.kind === 'Service') {
            delete obj.spec.clusterIP;
            delete obj.spec.clusterIPs;
        }

        obj.metadata = newMeta;
        return obj;
    }

    async migrateResources(
        sourceNs: string,
        destNs: string,
        selections: {
            services: string[];
            deployments: string[];
            configMaps: string[];
            secrets: string[];
            pvcs: string[];
        }
    ) {
        const coreApi = this.k8sClient.getCoreApi();
        const appsApi = this.k8sClient.getAppsApi();

        // 1. ConfigMaps
        for (const name of selections.configMaps) {
            try {
                const res = await coreApi.readNamespacedConfigMap({ name, namespace: sourceNs });
                const newCm = this.cleanMetadata(res, destNs);
                await coreApi.createNamespacedConfigMap({ namespace: destNs, body: newCm });
                this.ui.logSuccess(`ConfigMap ${name} migrated.`);
            } catch (e: any) {
                this.ui.logError(`Failed to migrate ConfigMap ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 2. Secrets
        for (const name of selections.secrets) {
            try {
                const res = await coreApi.readNamespacedSecret({ name, namespace: sourceNs });
                const newSecret = this.cleanMetadata(res, destNs);
                await coreApi.createNamespacedSecret({ namespace: destNs, body: newSecret });
                this.ui.logSuccess(`Secret ${name} migrated.`);
            } catch (e: any) {
                this.ui.logError(`Failed to migrate Secret ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 3. PVCs
        for (const name of selections.pvcs) {
            try {
                const res = await coreApi.readNamespacedPersistentVolumeClaim({ name, namespace: sourceNs });
                const newPvc = this.cleanMetadata(res, destNs);

                // Special handling for manual storage class (common in local tests/minikube)
                if (res.spec?.storageClassName === 'manual' && res.spec?.volumeName) {
                    try {
                        const pvName = res.spec.volumeName;
                        const pv = await coreApi.readPersistentVolume({ name: pvName });

                        // Clone PV if it's hostPath
                        if (pv.spec?.hostPath) {
                            const newPvName = `migrated-${pv.metadata?.name}-${Date.now()}`;
                            const newPv: any = {
                                apiVersion: 'v1',
                                kind: 'PersistentVolume',
                                metadata: {
                                    name: newPvName,
                                    labels: pv.metadata?.labels
                                },
                                spec: {
                                    ...pv.spec,
                                    claimRef: null, // Clear claim ref so it can be bound to new PVC
                                    hostPath: {
                                        ...pv.spec.hostPath,
                                        path: `${pv.spec.hostPath.path}-migrated-${Date.now()}` // Unique path
                                    }
                                }
                            };

                            // Remove system fields from PV spec if any
                            delete newPv.spec.claimRef;

                            await coreApi.createPersistentVolume({ body: newPv });
                            this.ui.logInfo(`Created new PV ${newPvName} for manual migration.`);

                            // Bind new PVC to this new PV
                            newPvc.spec.volumeName = newPvName;
                        }
                    } catch (pvError: any) {
                        this.ui.logError(`Failed to clone PV for manual PVC: ${pvError.message}. Proceeding with dynamic provisioning attempt.`);
                        delete newPvc.spec.volumeName;
                    }
                } else {
                    // Default behavior: Remove volumeName to allow dynamic provisioning
                    delete newPvc.spec.volumeName;
                }

                // Remove status
                delete newPvc.status;

                await coreApi.createNamespacedPersistentVolumeClaim({ namespace: destNs, body: newPvc });
                this.ui.logSuccess(`PVC ${name} created in destination.`);

                // Migrate Data
                await this.migratePVCData(sourceNs, name, destNs, name);

            } catch (e: any) {
                this.ui.logError(`Failed to migrate PVC ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 4. Services
        for (const name of selections.services) {
            try {
                const res = await coreApi.readNamespacedService({ name, namespace: sourceNs });
                const newSvc = this.cleanMetadata(res, destNs);
                await coreApi.createNamespacedService({ namespace: destNs, body: newSvc });
                this.ui.logSuccess(`Service ${name} migrated.`);
            } catch (e: any) {
                this.ui.logError(`Failed to migrate Service ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 5. Deployments
        for (const name of selections.deployments) {
            try {
                const res = await appsApi.readNamespacedDeployment({ name, namespace: sourceNs });
                const newDep = this.cleanMetadata(res, destNs);
                await appsApi.createNamespacedDeployment({ namespace: destNs, body: newDep });
                this.ui.logSuccess(`Deployment ${name} migrated.`);
            } catch (e: any) {
                this.ui.logError(`Failed to migrate Deployment ${name}: ${e.body?.message || e.message}`);
            }
        }
    }

    private async migratePVCData(sourceNs: string, sourcePvc: string, destNs: string, destPvc: string) {
        this.ui.logInfo(`Starting data migration for PVC ${sourcePvc}...`);

        const senderPodName = `migration-sender-${sourcePvc}-${Date.now()}`;
        const receiverPodName = `migration-receiver-${destPvc}-${Date.now()}`;

        // Helper to create a pod spec
        const createPodSpec = (name: string, ns: string, pvc: string, cmd: string[]) => {
            return {
                apiVersion: 'v1',
                kind: 'Pod',
                metadata: { name, namespace: ns },
                spec: {
                    containers: [{
                        name: 'worker',
                        image: 'alpine:latest',
                        command: cmd,
                        volumeMounts: [{ name: 'data', mountPath: '/data' }]
                    }],
                    volumes: [{ name: 'data', persistentVolumeClaim: { claimName: pvc } }],
                    restartPolicy: 'Never'
                }
            } as k8s.V1Pod;
        };

        const coreApi = this.k8sClient.getCoreApi();

        try {
            // Create Sender (sleep infinity to keep it running for exec)
            this.ui.logInfo(`Creating sender pod ${senderPodName} in ${sourceNs}...`);
            await coreApi.createNamespacedPod({ namespace: sourceNs, body: createPodSpec(senderPodName, sourceNs, sourcePvc, ['sleep', '3600']) });

            // Create Receiver
            this.ui.logInfo(`Creating receiver pod ${receiverPodName} in ${destNs}...`);
            await coreApi.createNamespacedPod({ namespace: destNs, body: createPodSpec(receiverPodName, destNs, destPvc, ['sleep', '3600']) });

            // Wait for pods to be ready
            this.ui.logInfo('Waiting for pods to be ready...');
            await this.waitForPodRunning(sourceNs, senderPodName);
            await this.waitForPodRunning(destNs, receiverPodName);

            // Execute Copy
            this.ui.logInfo('Transferring data...');
            // We use shell piping: kubectl exec sender ... tar | kubectl exec receiver ... tar
            // Note: This requires kubectl to be in the path

            const cmd = `kubectl exec ${senderPodName} -n ${sourceNs} -- tar cf - -C /data . | kubectl exec -i ${receiverPodName} -n ${destNs} -- tar xf - -C /data`;

            await new Promise<void>((resolve, reject) => {
                const child = spawn(cmd, { shell: true });

                child.stderr.on('data', (data) => {
                    // console.error(`Transfer stderr: ${data}`);
                });

                child.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Data transfer failed with code ${code}`));
                });
            });

            this.ui.logSuccess(`Data migration for PVC ${sourcePvc} completed.`);

        } catch (e: any) {
            this.ui.logError(`Data migration failed: ${e.message}`);
        } finally {
            // Cleanup
            this.ui.logInfo('Cleaning up migration pods...');
            try {
                await coreApi.deleteNamespacedPod({ name: senderPodName, namespace: sourceNs });
                await coreApi.deleteNamespacedPod({ name: receiverPodName, namespace: destNs });
            } catch (e) {
                // ignore cleanup errors
            }
        }
    }

    private async waitForPodRunning(ns: string, name: string) {
        const coreApi = this.k8sClient.getCoreApi();
        for (let i = 0; i < 60; i++) { // Wait up to 60 seconds
            const res = await coreApi.readNamespacedPod({ name, namespace: ns });
            if (res.status?.phase === 'Running') return;
            await new Promise(r => setTimeout(r, 1000));
        }
        throw new Error(`Pod ${name} did not start in time.`);
    }
}
