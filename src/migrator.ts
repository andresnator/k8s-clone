import * as k8s from '@kubernetes/client-node';
import { K8sClient } from './k8s.js';
import { UI } from './ui.js';
import { spawn } from 'child_process';

export class Migrator {
    private sourceClient: K8sClient;
    private destClient: K8sClient;
    private ui: UI;

    constructor(sourceClient: K8sClient, destClient: K8sClient, ui: UI) {
        this.sourceClient = sourceClient;
        this.destClient = destClient;
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

    private handleError(resourceType: string, name: string, error: any) {
        if (error.body && error.body.reason === 'AlreadyExists') {
            this.ui.logError(`${resourceType} '${name}' already exists in destination. Skipping.`);
        } else {
            this.ui.logError(`Failed to migrate ${resourceType} ${name}: ${error.body?.message || error.message}`);
        }
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

        const sourceCore = this.sourceClient.getCoreApi();
        const sourceApps = this.sourceClient.getAppsApi();
        const destCore = this.destClient.getCoreApi();
        const destApps = this.destClient.getAppsApi();

        // 1. ConfigMaps
        for (const name of selections.configMaps) {
            try {
                const res = await sourceCore.readNamespacedConfigMap({ name, namespace: sourceNs });
                const newCm = this.cleanMetadata(res, destNs);
                await destCore.createNamespacedConfigMap({ namespace: destNs, body: newCm });
                this.ui.logSuccess(`ConfigMap ${name} migrated.`);
            } catch (e: any) {
                this.handleError('ConfigMap', name, e);
            }
        }

        // 2. Secrets
        for (const name of selections.secrets) {
            try {
                const res = await sourceCore.readNamespacedSecret({ name, namespace: sourceNs });
                const newSecret = this.cleanMetadata(res, destNs);
                await destCore.createNamespacedSecret({ namespace: destNs, body: newSecret });
                this.ui.logSuccess(`Secret ${name} migrated.`);
            } catch (e: any) {
                this.handleError('Secret', name, e);
            }
        }

        // 3. PVCs
        for (const name of selections.pvcs) {
            try {
                const res = await sourceCore.readNamespacedPersistentVolumeClaim({ name, namespace: sourceNs });
                const newPvc = this.cleanMetadata(res, destNs);

                // Special handling for manual storage class (common in local tests/minikube)
                if (res.spec?.storageClassName === 'manual' && res.spec?.volumeName) {
                    try {
                        const pvName = res.spec.volumeName;
                        const pvRes = await sourceCore.readPersistentVolume({ name: pvName });
                        const newPv = this.cleanMetadata(pvRes, destNs); // PVs are cluster-wide, but we clean metadata

                        // Create a new PV name to avoid conflict
                        newPv.metadata!.name = `migrated-${pvName}-${Date.now()}`;
                        newPv.spec!.claimRef = undefined; // Clear claim ref so new PVC can bind

                        await destCore.createPersistentVolume({ body: newPv });
                        this.ui.logInfo(`Created new PV ${newPv.metadata!.name} for manual migration.`);

                        // Update PVC to point to new PV
                        newPvc.spec!.volumeName = newPv.metadata!.name;
                    } catch (pvError) {
                        // Ignore if PV not found or other issue, try creating PVC anyway
                    }
                } else {
                    // Default behavior: Remove volumeName to allow dynamic provisioning
                    delete newPvc.spec.volumeName;
                }

                // Remove status
                delete newPvc.status;

                await destCore.createNamespacedPersistentVolumeClaim({ namespace: destNs, body: newPvc });
                this.ui.logSuccess(`PVC ${name} created in destination.`);

                // Migrate Data
                await this.migratePVCData(sourceNs, name, destNs, name);

            } catch (e: any) {
                this.handleError('PVC', name, e);
            }
        }

        // 4. Services
        for (const name of selections.services) {
            try {
                const res = await sourceCore.readNamespacedService({ name, namespace: sourceNs });
                const newSvc = this.cleanMetadata(res, destNs);
                await destCore.createNamespacedService({ namespace: destNs, body: newSvc });
                this.ui.logSuccess(`Service ${name} migrated.`);
            } catch (e: any) {
                this.handleError('Service', name, e);
            }
        }

        // 5. Deployments
        for (const name of selections.deployments) {
            try {
                const res = await sourceApps.readNamespacedDeployment({ name, namespace: sourceNs });
                const newDep = this.cleanMetadata(res, destNs);
                await destApps.createNamespacedDeployment({ namespace: destNs, body: newDep });
                this.ui.logSuccess(`Deployment ${name} migrated.`);
            } catch (e: any) {
                this.handleError('Deployment', name, e);
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

        const sourceCore = this.sourceClient.getCoreApi();
        const destCore = this.destClient.getCoreApi();

        try {
            // Create Sender (sleep infinity to keep it running for exec)
            this.ui.logInfo(`Creating sender pod ${senderPodName} in ${sourceNs}...`);
            await sourceCore.createNamespacedPod({ namespace: sourceNs, body: createPodSpec(senderPodName, sourceNs, sourcePvc, ['sleep', '3600']) });

            // Create Receiver
            this.ui.logInfo(`Creating receiver pod ${receiverPodName} in ${destNs}...`);
            await destCore.createNamespacedPod({ namespace: destNs, body: createPodSpec(receiverPodName, destNs, destPvc, ['sleep', '3600']) });

            // Wait for pods to be ready
            this.ui.logInfo('Waiting for pods to be ready...');
            await this.waitForPodRunning(this.sourceClient, sourceNs, senderPodName);
            await this.waitForPodRunning(this.destClient, destNs, receiverPodName);

            // Execute Copy
            this.ui.logInfo('Transferring data...');
            // We use shell piping: kubectl exec sender ... tar | kubectl exec receiver ... tar
            // Note: This requires kubectl to be in the path
            const sourceCtx = this.sourceClient.getCurrentContext();
            const destCtx = this.destClient.getCurrentContext();

            const cmd = `kubectl --context ${sourceCtx} exec ${senderPodName} -n ${sourceNs} -- tar cf - -C /data . | kubectl --context ${destCtx} exec -i ${receiverPodName} -n ${destNs} -- tar xf - -C /data`;

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
                await sourceCore.deleteNamespacedPod({ name: senderPodName, namespace: sourceNs });
                await destCore.deleteNamespacedPod({ name: receiverPodName, namespace: destNs });
            } catch (e) {
                // ignore cleanup errors
            }
        }
    }

    private async waitForPodRunning(client: K8sClient, ns: string, name: string) {
        const coreApi = client.getCoreApi();
        for (let i = 0; i < 60; i++) { // Wait up to 60 seconds
            const res = await coreApi.readNamespacedPod({ name, namespace: ns });
            if (res.status?.phase === 'Running') return;
            await new Promise(r => setTimeout(r, 1000));
        }
        throw new Error(`Pod ${name} did not start in time.`);
    }
}
