import * as k8s from '@kubernetes/client-node';
import { K8sClient } from './k8s.js';
import { UI } from './ui.js';
import { MetadataCleaner } from './metadata-cleaner.js';
import { ResourceType } from './types.js';
import { applyOverwriteSpec } from './spec-overwriter.js';

/**
 * Interface for resource migration handlers.
 * Each handler knows how to read from source and create in destination.
 */
export interface ResourceHandler {
    resourceType: string;
    migrate(name: string, sourceNs: string, destNs: string, overwriteSpec?: Record<string, any>): Promise<void>;
}

/**
 * Interface for resource deletion handlers.
 */
export interface DeleteHandler {
    resourceType: string;
    delete(name: string, namespace: string): Promise<void>;
}

/**
 * Base class for resource handlers providing common error handling.
 */
abstract class BaseResourceHandler implements ResourceHandler {
    protected ui: UI;
    abstract resourceType: string;

    constructor(ui: UI) {
        this.ui = ui;
    }

    abstract migrate(name: string, sourceNs: string, destNs: string, overwriteSpec?: Record<string, any>): Promise<void>;

    protected handleError(name: string, error: any): void {
        if (error.body && error.body.reason === 'AlreadyExists') {
            this.ui.logError(`${this.resourceType} '${name}' already exists in destination. Skipping.`);
        } else {
            this.ui.logError(`Failed to migrate ${this.resourceType} ${name}: ${error.body?.message || error.message}`);
        }
    }
}

/**
 * Handler for ConfigMap migration.
 */
export class ConfigMapHandler extends BaseResourceHandler {
    resourceType = 'ConfigMap';
    private sourceApi: k8s.CoreV1Api;
    private destApi: k8s.CoreV1Api;

    constructor(sourceClient: K8sClient, destClient: K8sClient, ui: UI) {
        super(ui);
        this.sourceApi = sourceClient.getCoreApi();
        this.destApi = destClient.getCoreApi();
    }

    async migrate(name: string, sourceNs: string, destNs: string, overwriteSpec?: Record<string, any>): Promise<void> {
        try {
            const res = await this.sourceApi.readNamespacedConfigMap({ name, namespace: sourceNs });
            const cleaned = MetadataCleaner.clean(res, destNs);
            if (overwriteSpec) {
                applyOverwriteSpec(cleaned, overwriteSpec);
            }
            await this.destApi.createNamespacedConfigMap({ namespace: destNs, body: cleaned });
            this.ui.logSuccess(`${this.resourceType} ${name} migrated.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Handler for Secret migration.
 */
export class SecretHandler extends BaseResourceHandler {
    resourceType = 'Secret';
    private sourceApi: k8s.CoreV1Api;
    private destApi: k8s.CoreV1Api;

    constructor(sourceClient: K8sClient, destClient: K8sClient, ui: UI) {
        super(ui);
        this.sourceApi = sourceClient.getCoreApi();
        this.destApi = destClient.getCoreApi();
    }

    async migrate(name: string, sourceNs: string, destNs: string, overwriteSpec?: Record<string, any>): Promise<void> {
        try {
            const res = await this.sourceApi.readNamespacedSecret({ name, namespace: sourceNs });
            const cleaned = MetadataCleaner.clean(res, destNs);
            if (overwriteSpec) {
                applyOverwriteSpec(cleaned, overwriteSpec);
            }
            await this.destApi.createNamespacedSecret({ namespace: destNs, body: cleaned });
            this.ui.logSuccess(`${this.resourceType} ${name} migrated.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Handler for Service migration.
 */
export class ServiceHandler extends BaseResourceHandler {
    resourceType = 'Service';
    private sourceApi: k8s.CoreV1Api;
    private destApi: k8s.CoreV1Api;

    constructor(sourceClient: K8sClient, destClient: K8sClient, ui: UI) {
        super(ui);
        this.sourceApi = sourceClient.getCoreApi();
        this.destApi = destClient.getCoreApi();
    }

    async migrate(name: string, sourceNs: string, destNs: string, overwriteSpec?: Record<string, any>): Promise<void> {
        try {
            const res = await this.sourceApi.readNamespacedService({ name, namespace: sourceNs });
            const cleaned = MetadataCleaner.clean(res, destNs);
            if (overwriteSpec) {
                applyOverwriteSpec(cleaned, overwriteSpec);
            }
            await this.destApi.createNamespacedService({ namespace: destNs, body: cleaned });
            this.ui.logSuccess(`${this.resourceType} ${name} migrated.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Handler for Deployment migration.
 */
export class DeploymentHandler extends BaseResourceHandler {
    resourceType = 'Deployment';
    private sourceApi: k8s.AppsV1Api;
    private destApi: k8s.AppsV1Api;

    constructor(sourceClient: K8sClient, destClient: K8sClient, ui: UI) {
        super(ui);
        this.sourceApi = sourceClient.getAppsApi();
        this.destApi = destClient.getAppsApi();
    }

    async migrate(name: string, sourceNs: string, destNs: string, overwriteSpec?: Record<string, any>): Promise<void> {
        try {
            const res = await this.sourceApi.readNamespacedDeployment({ name, namespace: sourceNs });
            const cleaned = MetadataCleaner.clean(res, destNs);
            if (overwriteSpec) {
                applyOverwriteSpec(cleaned, overwriteSpec);
            }
            await this.destApi.createNamespacedDeployment({ namespace: destNs, body: cleaned });
            this.ui.logSuccess(`${this.resourceType} ${name} migrated.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Factory for creating resource handler maps.
 * Uses Map structure as requested in the issue for managing component handlers.
 */
export class ResourceHandlerFactory {
    /**
     * Creates a Map of resource type to handler for migration operations.
     * The order of entries in the Map determines migration order.
     */
    static createMigrationHandlers(
        sourceClient: K8sClient,
        destClient: K8sClient,
        ui: UI
    ): Map<ResourceType, ResourceHandler> {
        const handlers = new Map<ResourceType, ResourceHandler>();
        
        // Order matters: ConfigMaps and Secrets first (may be referenced by Deployments)
        handlers.set(ResourceType.ConfigMap, new ConfigMapHandler(sourceClient, destClient, ui));
        handlers.set(ResourceType.Secret, new SecretHandler(sourceClient, destClient, ui));
        // Services before Deployments
        handlers.set(ResourceType.Service, new ServiceHandler(sourceClient, destClient, ui));
        handlers.set(ResourceType.Deployment, new DeploymentHandler(sourceClient, destClient, ui));
        
        return handlers;
    }
}

/**
 * Base class for deletion handlers.
 */
abstract class BaseDeleteHandler implements DeleteHandler {
    protected ui: UI;
    abstract resourceType: string;

    constructor(ui: UI) {
        this.ui = ui;
    }

    abstract delete(name: string, namespace: string): Promise<void>;

    protected handleError(name: string, error: any): void {
        this.ui.logError(`Failed to delete ${this.resourceType} ${name}: ${error.body?.message || error.message}`);
    }
}

/**
 * Handler for ConfigMap deletion.
 */
export class ConfigMapDeleteHandler extends BaseDeleteHandler {
    resourceType = 'ConfigMap';
    private api: k8s.CoreV1Api;

    constructor(client: K8sClient, ui: UI) {
        super(ui);
        this.api = client.getCoreApi();
    }

    async delete(name: string, namespace: string): Promise<void> {
        try {
            await this.api.deleteNamespacedConfigMap({ name, namespace });
            this.ui.logSuccess(`${this.resourceType} ${name} deleted.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Handler for Secret deletion.
 */
export class SecretDeleteHandler extends BaseDeleteHandler {
    resourceType = 'Secret';
    private api: k8s.CoreV1Api;

    constructor(client: K8sClient, ui: UI) {
        super(ui);
        this.api = client.getCoreApi();
    }

    async delete(name: string, namespace: string): Promise<void> {
        try {
            await this.api.deleteNamespacedSecret({ name, namespace });
            this.ui.logSuccess(`${this.resourceType} ${name} deleted.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Handler for Service deletion.
 */
export class ServiceDeleteHandler extends BaseDeleteHandler {
    resourceType = 'Service';
    private api: k8s.CoreV1Api;

    constructor(client: K8sClient, ui: UI) {
        super(ui);
        this.api = client.getCoreApi();
    }

    async delete(name: string, namespace: string): Promise<void> {
        try {
            await this.api.deleteNamespacedService({ name, namespace });
            this.ui.logSuccess(`${this.resourceType} ${name} deleted.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Handler for Deployment deletion.
 */
export class DeploymentDeleteHandler extends BaseDeleteHandler {
    resourceType = 'Deployment';
    private api: k8s.AppsV1Api;

    constructor(client: K8sClient, ui: UI) {
        super(ui);
        this.api = client.getAppsApi();
    }

    async delete(name: string, namespace: string): Promise<void> {
        try {
            await this.api.deleteNamespacedDeployment({ name, namespace });
            this.ui.logSuccess(`${this.resourceType} ${name} deleted.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Handler for PVC deletion.
 */
export class PVCDeleteHandler extends BaseDeleteHandler {
    resourceType = 'PVC';
    private api: k8s.CoreV1Api;

    constructor(client: K8sClient, ui: UI) {
        super(ui);
        this.api = client.getCoreApi();
    }

    async delete(name: string, namespace: string): Promise<void> {
        try {
            await this.api.deleteNamespacedPersistentVolumeClaim({ name, namespace });
            this.ui.logSuccess(`${this.resourceType} ${name} deleted.`);
        } catch (e: any) {
            this.handleError(name, e);
        }
    }
}

/**
 * Factory for creating deletion handler maps.
 */
export class DeleteHandlerFactory {
    /**
     * Creates a Map of resource type to handler for deletion operations.
     * The order determines deletion order (Deployments first, then Services, etc.)
     */
    static createDeleteHandlers(client: K8sClient, ui: UI): Map<ResourceType, DeleteHandler> {
        const handlers = new Map<ResourceType, DeleteHandler>();
        
        // Deletion order: Deployments first, then Services, PVCs, ConfigMaps, Secrets
        handlers.set(ResourceType.Deployment, new DeploymentDeleteHandler(client, ui));
        handlers.set(ResourceType.Service, new ServiceDeleteHandler(client, ui));
        handlers.set(ResourceType.PVC, new PVCDeleteHandler(client, ui));
        handlers.set(ResourceType.ConfigMap, new ConfigMapDeleteHandler(client, ui));
        handlers.set(ResourceType.Secret, new SecretDeleteHandler(client, ui));
        
        return handlers;
    }
}
