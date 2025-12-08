/**
 * Common interface for resource selections used in migration and cleanup operations.
 */
export interface ResourceSelections {
    services: string[];
    deployments: string[];
    configMaps: string[];
    secrets: string[];
    pvcs: string[];
}

/**
 * Enum defining the supported Kubernetes resource types.
 */
export enum ResourceType {
    ConfigMap = 'configMaps',
    Secret = 'secrets',
    PVC = 'pvcs',
    Service = 'services',
    Deployment = 'deployments',
}

/**
 * Type for config resource identifiers.
 */
export type ConfigResourceType = 'services' | 'deployments' | 'configMaps' | 'secrets' | 'persistentVolumeClaims';

/**
 * Metadata fields that should be preserved during migration.
 */
export interface PreservableMetadata {
    name?: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
}

/**
 * Metadata fields that should be removed during migration.
 */
export const SYSTEM_METADATA_FIELDS = [
    'uid',
    'resourceVersion',
    'creationTimestamp',
    'selfLink',
    'generation',
    'ownerReferences',
    'managedFields',
] as const;

/**
 * Represents a resource within an app with optional spec overrides.
 */
export interface AppResource {
    resource: string;
    'overwrite-spec'?: Record<string, any>;
}

/**
 * Configuration for a custom app grouping related Kubernetes resources.
 */
export interface AppConfig {
    name: string;
    context: string;
    namespaces: string;
    services?: AppResource[];
    deployments?: AppResource[];
    configMaps?: AppResource[];
    secrets?: AppResource[];
    persistentVolumeClaims?: AppResource[];
}
