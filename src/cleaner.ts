import { K8sClient } from './k8s.js';
import { UI } from './ui.js';
import { ResourceSelections, ResourceType } from './types.js';
import { DeleteHandlerFactory, DeleteHandler } from './resource-handlers.js';

/**
 * Handles deletion of Kubernetes resources from a namespace.
 * Uses Map-based handlers for different resource types following SRP.
 */
export class Cleaner {
    private client: K8sClient;
    private ui: UI;
    private handlers: Map<ResourceType, DeleteHandler>;

    constructor(client: K8sClient, ui: UI) {
        this.client = client;
        this.ui = ui;
        this.handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);
    }

    /**
     * Deletes selected resources from the specified namespace.
     * Resources are deleted in order: Deployments, Services, PVCs, ConfigMaps, Secrets.
     */
    async cleanResources(
        namespace: string,
        selections: ResourceSelections
    ) {
        // Create a map of resource type to selected names for ordered processing
        const resourceMap = new Map<ResourceType, string[]>([
            [ResourceType.Deployment, selections.deployments],
            [ResourceType.Service, selections.services],
            [ResourceType.PVC, selections.pvcs],
            [ResourceType.ConfigMap, selections.configMaps],
            [ResourceType.Secret, selections.secrets],
        ]);

        // Process deletions using handlers in order
        for (const [resourceType, names] of resourceMap) {
            const handler = this.handlers.get(resourceType);
            if (handler) {
                for (const name of names) {
                    await handler.delete(name, namespace);
                }
            }
        }
    }
}
