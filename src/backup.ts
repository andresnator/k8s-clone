import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Utility class for backing up Kubernetes resources as YAML files.
 * Creates timestamped backup directories and saves resources before processing.
 */
export class BackupManager {
    private backupDir: string | null = null;
    private processedBackupDir: string | null = null;

    /**
     * Generates a timestamp string in the format YYYYMMDD_HHMMSS.
     */
    private static generateTimestamp(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}_${hour}${minute}${second}`;
    }

    /**
     * Generates a timestamped backup directory path.
     * Format: /tmp/k8s_source_[YYYYMMDD]_[HHMMSS]/
     */
    private static generateBackupPath(): string {
        const timestamp = BackupManager.generateTimestamp();
        return `/tmp/k8s_source_${timestamp}`;
    }

    /**
     * Generates a timestamped post-processing backup directory path.
     * Format: /tmp/backup_processed_[YYYYMMDD]_[HHMMSS]/
     */
    private static generateProcessedBackupPath(): string {
        const timestamp = BackupManager.generateTimestamp();
        return `/tmp/backup_processed_${timestamp}`;
    }

    /**
     * Creates the backup directory if it doesn't exist.
     * Returns the path to the backup directory.
     */
    public ensureBackupDir(): string {
        if (!this.backupDir) {
            this.backupDir = BackupManager.generateBackupPath();
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }
        }
        return this.backupDir;
    }

    /**
     * Gets the current backup directory path.
     */
    public getBackupDir(): string | null {
        return this.backupDir;
    }

    /**
     * Creates the post-processing backup directory if it doesn't exist.
     * Returns the path to the post-processing backup directory.
     */
    public ensureProcessedBackupDir(): string {
        if (!this.processedBackupDir) {
            this.processedBackupDir = BackupManager.generateProcessedBackupPath();
            if (!fs.existsSync(this.processedBackupDir)) {
                fs.mkdirSync(this.processedBackupDir, { recursive: true });
            }
        }
        return this.processedBackupDir;
    }

    /**
     * Gets the current post-processing backup directory path.
     */
    public getProcessedBackupDir(): string | null {
        return this.processedBackupDir;
    }

    /**
     * Saves a Kubernetes resource as a YAML file in the specified directory.
     * 
     * @param resource - The Kubernetes resource object to backup
     * @param resourceType - Type of resource (e.g., 'ConfigMap', 'Secret')
     * @param name - Name of the resource
     * @param namespace - Namespace of the resource
     * @param directory - The directory to save the file in
     * @returns Path to the saved file
     */
    private writeResourceToYaml(
        resource: any,
        resourceType: string,
        name: string,
        namespace: string,
        directory: string
    ): string {
        // Sanitize filename components to avoid filesystem issues
        const sanitize = (str: string) => str.replace(/[:/\\]/g, '_');
        
        // Create a safe filename: namespace_resourceType_name.yaml
        const filename = `${sanitize(namespace)}_${sanitize(resourceType)}_${sanitize(name)}.yaml`;
        const filepath = path.join(directory, filename);
        
        // Convert resource to YAML
        const yamlContent = yaml.dump(resource, { indent: 2 });
        
        // Write to file with read and write permission for owner, read-only for group and others
        fs.writeFileSync(filepath, yamlContent, { 
            encoding: 'utf-8',
            mode: 0o644 // Read and write for owner, read-only for group and others
        });
        
        return filepath;
    }

    /**
     * Saves a Kubernetes resource as a YAML file in the backup directory.
     * 
     * @param resource - The Kubernetes resource object to backup
     * @param resourceType - Type of resource (e.g., 'ConfigMap', 'Secret')
     * @param name - Name of the resource
     * @param namespace - Namespace of the resource
     * @returns Path to the saved file
     */
    public backupResource(
        resource: any,
        resourceType: string,
        name: string,
        namespace: string
    ): string {
        const backupDir = this.ensureBackupDir();
        return this.writeResourceToYaml(resource, resourceType, name, namespace, backupDir);
    }

    /**
     * Saves a processed Kubernetes resource as a YAML file in the post-processing backup directory.
     * This is called AFTER the resource has been cleaned and modified but BEFORE applying to cluster.
     * 
     * @param resource - The processed Kubernetes resource object to backup
     * @param resourceType - Type of resource (e.g., 'ConfigMap', 'Secret')
     * @param name - Name of the resource
     * @param namespace - Namespace of the resource
     * @returns Path to the saved file
     */
    public backupProcessedResource(
        resource: any,
        resourceType: string,
        name: string,
        namespace: string
    ): string {
        const processedBackupDir = this.ensureProcessedBackupDir();
        return this.writeResourceToYaml(resource, resourceType, name, namespace, processedBackupDir);
    }

    /**
     * Validates that a file exists and is readable.
     * 
     * @param filepath - Path to the file to validate
     * @returns true if file exists and is readable
     */
    public validateBackup(filepath: string): boolean {
        try {
            fs.accessSync(filepath, fs.constants.R_OK);
            return true;
        } catch {
            return false;
        }
    }
}
