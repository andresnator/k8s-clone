import * as k8s from '@kubernetes/client-node';
import { K8sClient } from './k8s.js';
import { UI } from './ui.js';
import { spawn } from 'child_process';
import { ResourceSelections, ResourceType } from './types.js';
import { MetadataCleaner } from './metadata-cleaner.js';
import { ResourceHandlerFactory } from './resource-handlers.js';

/**
 * Handles migration of Kubernetes resources between namespaces/clusters.
 * Uses Map-based handlers for different resource types following SRP.
 */
export class Migrator {
    private sourceClient: K8sClient;
    private destClient: K8sClient;
    private ui: UI;
    private handlers: Map<ResourceType, { migrate: (name: string, sourceNs: string, destNs: string) => Promise<void> }>;

    constructor(sourceClient: K8sClient, destClient: K8sClient, ui: UI) {
        this.sourceClient = sourceClient;
        this.destClient = destClient;
        this.ui = ui;
        this.handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);
    }

    /**
     * @deprecated Use MetadataCleaner.clean() instead. Kept for backward compatibility.
     */
    private cleanMetadata(obj: any, targetNamespace: string) {
        return MetadataCleaner.clean(obj, targetNamespace);
    }

    private handleError(resourceType: string, name: string, error: any) {
        if (error.body && error.body.reason === 'AlreadyExists') {
            this.ui.logError(`${resourceType} '${name}' already exists in destination. Skipping.`);
        } else {
            this.ui.logError(`Failed to migrate ${resourceType} ${name}: ${error.body?.message || error.message}`);
        }
    }

    /**
     * Migrates selected resources from source to destination namespace.
     * Resources are migrated in dependency order: ConfigMaps, Secrets, PVCs, Services, Deployments.
     */
    async migrateResources(
        sourceNs: string,
        destNs: string,
        selections: ResourceSelections
    ) {
        // Create a map of resource type to selected names for ordered processing
        const resourceMap = new Map<ResourceType, string[]>([
            [ResourceType.ConfigMap, selections.configMaps],
            [ResourceType.Secret, selections.secrets],
            [ResourceType.Service, selections.services],
            [ResourceType.Deployment, selections.deployments],
        ]);

        // Process resources using handlers in order
        for (const [resourceType, names] of resourceMap) {
            const handler = this.handlers.get(resourceType);
            if (handler) {
                for (const name of names) {
                    await handler.migrate(name, sourceNs, destNs);
                }
            }
        }

        // Handle PVCs separately due to complex data migration logic
        await this.migratePVCs(sourceNs, destNs, selections.pvcs);
    }

    /**
     * Handles PVC migration including optional data transfer.
     * PVC migration is handled separately due to:
     * - Special handling for manual storage class
     * - Data migration via temporary pods
     */
    private async migratePVCs(sourceNs: string, destNs: string, pvcNames: string[]): Promise<void> {
        const sourceCore = this.sourceClient.getCoreApi();
        const destCore = this.destClient.getCoreApi();

        for (const name of pvcNames) {
            try {
                const res = await sourceCore.readNamespacedPersistentVolumeClaim({ name, namespace: sourceNs });
                const newPvc = MetadataCleaner.clean(res, destNs);

                // Handle manual storage class migration
                if (res.spec?.storageClassName === 'manual' && res.spec?.volumeName) {
                    await this.migrateManualPV(res.spec.volumeName, newPvc, destCore);
                } else {
                    // Dynamic provisioning: remove volumeName
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
    }

    /**
     * Migrates a PersistentVolume for manual storage class.
     */
    private async migrateManualPV(pvName: string, pvc: any, destCore: k8s.CoreV1Api): Promise<void> {
        const sourceCore = this.sourceClient.getCoreApi();
        
        try {
            const pvRes = await sourceCore.readPersistentVolume({ name: pvName });
            const newPvName = `migrated-${pvName}-${Date.now()}`;
            const newPv = MetadataCleaner.cleanPersistentVolume(pvRes, newPvName);

            await destCore.createPersistentVolume({ body: newPv });
            this.ui.logInfo(`Created new PV ${newPvName} for manual migration.`);

            // Update PVC to point to new PV
            pvc.spec!.volumeName = newPvName;
        } catch (pvError) {
            // Ignore if PV not found or other issue, try creating PVC anyway
        }
    }

    /**
     * Creates a pod specification for data migration.
     */
    private createMigrationPodSpec(name: string, ns: string, pvc: string, cmd: string[]): k8s.V1Pod {
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
    }

    /**
     * Migrates data between PVCs using temporary pods and kubectl exec.
     */
    private async migratePVCData(sourceNs: string, sourcePvc: string, destNs: string, destPvc: string) {
        this.ui.logInfo(`Starting data migration for PVC ${sourcePvc}...`);

        const senderPodName = `migration-sender-${sourcePvc}-${Date.now()}`;
        const receiverPodName = `migration-receiver-${destPvc}-${Date.now()}`;

        const sourceCore = this.sourceClient.getCoreApi();
        const destCore = this.destClient.getCoreApi();

        try {
            await this.createMigrationPods(
                sourceCore, destCore,
                sourceNs, destNs,
                senderPodName, receiverPodName,
                sourcePvc, destPvc
            );

            await this.transferData(sourceNs, destNs, senderPodName, receiverPodName);
            this.ui.logSuccess(`Data migration for PVC ${sourcePvc} completed.`);

        } catch (e: any) {
            this.ui.logError(`Data migration failed: ${e.message}`);
        } finally {
            await this.cleanupMigrationPods(
                sourceCore, destCore,
                sourceNs, destNs,
                senderPodName, receiverPodName
            );
        }
    }

    /**
     * Creates sender and receiver pods for data migration.
     */
    private async createMigrationPods(
        sourceCore: k8s.CoreV1Api,
        destCore: k8s.CoreV1Api,
        sourceNs: string,
        destNs: string,
        senderPodName: string,
        receiverPodName: string,
        sourcePvc: string,
        destPvc: string
    ): Promise<void> {
        this.ui.logInfo(`Creating sender pod ${senderPodName} in ${sourceNs}...`);
        await sourceCore.createNamespacedPod({
            namespace: sourceNs,
            body: this.createMigrationPodSpec(senderPodName, sourceNs, sourcePvc, ['sleep', '3600'])
        });

        this.ui.logInfo(`Creating receiver pod ${receiverPodName} in ${destNs}...`);
        await destCore.createNamespacedPod({
            namespace: destNs,
            body: this.createMigrationPodSpec(receiverPodName, destNs, destPvc, ['sleep', '3600'])
        });

        this.ui.logInfo('Waiting for pods to be ready...');
        await this.waitForPodRunning(this.sourceClient, sourceNs, senderPodName);
        await this.waitForPodRunning(this.destClient, destNs, receiverPodName);
    }

    /**
     * Transfers data between pods using kubectl exec and tar.
     */
    private async transferData(
        sourceNs: string,
        destNs: string,
        senderPodName: string,
        receiverPodName: string
    ): Promise<void> {
        this.ui.logInfo('Transferring data...');
        const sourceCtx = this.sourceClient.getCurrentContext();
        const destCtx = this.destClient.getCurrentContext();

        const cmd = `kubectl --context ${sourceCtx} exec ${senderPodName} -n ${sourceNs} -- tar cf - -C /data . | kubectl --context ${destCtx} exec -i ${receiverPodName} -n ${destNs} -- tar xf - -C /data`;

        await new Promise<void>((resolve, reject) => {
            const child = spawn(cmd, { shell: true });

            child.stderr.on('data', () => {
                // Silently handle stderr
            });

            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Data transfer failed with code ${code}`));
            });
        });
    }

    /**
     * Cleans up migration pods after data transfer.
     */
    private async cleanupMigrationPods(
        sourceCore: k8s.CoreV1Api,
        destCore: k8s.CoreV1Api,
        sourceNs: string,
        destNs: string,
        senderPodName: string,
        receiverPodName: string
    ): Promise<void> {
        this.ui.logInfo('Cleaning up migration pods...');
        try {
            await sourceCore.deleteNamespacedPod({ name: senderPodName, namespace: sourceNs });
            await destCore.deleteNamespacedPod({ name: receiverPodName, namespace: destNs });
        } catch (e) {
            // ignore cleanup errors
        }
    }

    /**
     * Waits for a pod to reach Running state.
     */
    private async waitForPodRunning(client: K8sClient, ns: string, name: string): Promise<void> {
        const coreApi = client.getCoreApi();
        const maxWaitSeconds = 60;
        
        for (let i = 0; i < maxWaitSeconds; i++) {
            const res = await coreApi.readNamespacedPod({ name, namespace: ns });
            if (res.status?.phase === 'Running') return;
            await new Promise(r => setTimeout(r, 1000));
        }
        throw new Error(`Pod ${name} did not start in time.`);
    }
}
