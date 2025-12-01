import { K8sClient } from './k8s.js';
import { UI } from './ui.js';

export class Cleaner {
    private client: K8sClient;
    private ui: UI;

    constructor(client: K8sClient, ui: UI) {
        this.client = client;
        this.ui = ui;
    }

    async cleanResources(
        namespace: string,
        selections: {
            services: string[];
            deployments: string[];
            configMaps: string[];
            secrets: string[];
            pvcs: string[];
        }
    ) {
        const coreApi = this.client.getCoreApi();
        const appsApi = this.client.getAppsApi();

        // 1. Deployments
        for (const name of selections.deployments) {
            try {
                await appsApi.deleteNamespacedDeployment({ name, namespace });
                this.ui.logSuccess(`Deployment ${name} deleted.`);
            } catch (e: any) {
                this.ui.logError(`Failed to delete Deployment ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 2. Services
        for (const name of selections.services) {
            try {
                await coreApi.deleteNamespacedService({ name, namespace });
                this.ui.logSuccess(`Service ${name} deleted.`);
            } catch (e: any) {
                this.ui.logError(`Failed to delete Service ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 3. PVCs
        for (const name of selections.pvcs) {
            try {
                await coreApi.deleteNamespacedPersistentVolumeClaim({ name, namespace });
                this.ui.logSuccess(`PVC ${name} deleted.`);
            } catch (e: any) {
                this.ui.logError(`Failed to delete PVC ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 4. ConfigMaps
        for (const name of selections.configMaps) {
            try {
                await coreApi.deleteNamespacedConfigMap({ name, namespace });
                this.ui.logSuccess(`ConfigMap ${name} deleted.`);
            } catch (e: any) {
                this.ui.logError(`Failed to delete ConfigMap ${name}: ${e.body?.message || e.message}`);
            }
        }

        // 5. Secrets
        for (const name of selections.secrets) {
            try {
                await coreApi.deleteNamespacedSecret({ name, namespace });
                this.ui.logSuccess(`Secret ${name} deleted.`);
            } catch (e: any) {
                this.ui.logError(`Failed to delete Secret ${name}: ${e.body?.message || e.message}`);
            }
        }
    }
}
