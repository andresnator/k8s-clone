import { PreservableMetadata } from './types.js';

/**
 * Utility class for cleaning Kubernetes resource metadata before migration.
 * Follows Single Responsibility Principle - only handles metadata cleaning.
 */
export class MetadataCleaner {
    /**
     * Cleans metadata from a Kubernetes resource for migration.
     * Preserves essential fields (name, labels, annotations) and removes system-managed fields.
     * 
     * @param obj - The Kubernetes resource object to clean
     * @param targetNamespace - The destination namespace for the resource
     * @returns The cleaned resource object
     */
    static clean(obj: any, targetNamespace: string): any {
        if (!obj.metadata) obj.metadata = {};

        const newMeta: PreservableMetadata = {
            name: obj.metadata.name,
            namespace: targetNamespace,
            labels: obj.metadata.labels,
            annotations: obj.metadata.annotations,
        };

        // Clean status
        delete obj.status;

        // Handle Service-specific cleanup
        if (obj.kind === 'Service') {
            this.cleanServiceSpec(obj);
        }

        obj.metadata = newMeta;
        return obj;
    }

    /**
     * Cleans Service-specific fields that cannot be migrated.
     * ClusterIP is assigned by the cluster and must be removed for creation.
     * 
     * @param obj - The Service object to clean
     */
    private static cleanServiceSpec(obj: any): void {
        if (obj.spec) {
            delete obj.spec.clusterIP;
            delete obj.spec.clusterIPs;
        }
    }

    /**
     * Cleans a PersistentVolume for migration.
     * Clears the claimRef to allow new PVC binding.
     * 
     * @param obj - The PV object to clean
     * @param newName - New name for the PV
     * @returns The cleaned PV object
     */
    static cleanPersistentVolume(obj: any, newName: string): any {
        const cleaned = this.clean(obj, '');
        cleaned.metadata!.name = newName;
        if (cleaned.spec) {
            cleaned.spec.claimRef = undefined;
        }
        return cleaned;
    }

    /**
     * Cleans a PersistentVolumeClaim for migration.
     * Removes volumeName to allow dynamic provisioning unless it's a manual storage class.
     * 
     * @param obj - The PVC object to clean
     * @param targetNamespace - The destination namespace
     * @param keepVolumeName - Whether to keep the volumeName (for manual storage class)
     * @returns The cleaned PVC object
     */
    static cleanPVC(obj: any, targetNamespace: string, keepVolumeName: boolean = false): any {
        const cleaned = this.clean(obj, targetNamespace);
        
        if (!keepVolumeName && cleaned.spec) {
            delete cleaned.spec.volumeName;
        }
        
        delete cleaned.status;
        return cleaned;
    }
}
