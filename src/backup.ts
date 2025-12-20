import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Utility class for backing up Kubernetes resources as YAML files.
 * Creates timestamped backup directories and saves resources before processing.
 */
export class BackupManager {
    private backupDir: string | null = null;

    /**
     * Generates a timestamped backup directory path.
     * Format: /tmp/k8s_source_[YYYYMMDD]_[HHMMSS]/
     */
    private static generateBackupPath(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        
        const timestamp = `${year}${month}${day}_${hour}${minute}${second}`;
        return `/tmp/k8s_source_${timestamp}`;
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
     * Saves a Kubernetes resource as a YAML file in the backup directory.
     * 
     * @param resource - The Kubernetes resource object to backup
     * @param resourceType - Type of resource (e.g., 'ConfigMap', 'Secret')
     * @param name - Name of the resource
     * @param namespace - Namespace of the resource
     * @returns Path to the saved file
     */
    public async backupResource(
        resource: any,
        resourceType: string,
        name: string,
        namespace: string
    ): Promise<string> {
        const backupDir = this.ensureBackupDir();
        
        // Create a safe filename: namespace_resourceType_name.yaml
        const filename = `${namespace}_${resourceType}_${name}.yaml`;
        const filepath = path.join(backupDir, filename);
        
        // Convert resource to YAML
        const yamlContent = yaml.dump(resource, { indent: 2 });
        
        // Write to file with read permissions
        fs.writeFileSync(filepath, yamlContent, { 
            encoding: 'utf-8',
            mode: 0o644 // Read permissions for owner, group, and others
        });
        
        // Validate the file was created successfully
        if (!fs.existsSync(filepath)) {
            throw new Error(`Failed to create backup file: ${filepath}`);
        }
        
        return filepath;
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
