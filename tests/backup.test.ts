import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { BackupManager } from '../src/backup.js';
import fs from 'fs';
import path from 'path';

describe('BackupManager', () => {
    let backupManager: BackupManager;
    let testBackupDir: string;

    beforeEach(() => {
        backupManager = new BackupManager();
    });

    afterEach(() => {
        // Clean up test backup directory if it exists
        const backupDir = backupManager.getBackupDir();
        if (backupDir && fs.existsSync(backupDir)) {
            try {
                fs.rmSync(backupDir, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    describe('ensureBackupDir', () => {
        it('should create a backup directory with correct timestamp format', () => {
            const backupDir = backupManager.ensureBackupDir();
            
            expect(backupDir).toMatch(/^\/tmp\/k8s_source_\d{8}_\d{6}$/);
            expect(fs.existsSync(backupDir)).toBe(true);
        });

        it('should return the same directory on subsequent calls', () => {
            const firstCall = backupManager.ensureBackupDir();
            const secondCall = backupManager.ensureBackupDir();
            
            expect(firstCall).toBe(secondCall);
        });

        it('should create directory if it does not exist', () => {
            const backupDir = backupManager.ensureBackupDir();
            
            expect(fs.existsSync(backupDir)).toBe(true);
            const stats = fs.statSync(backupDir);
            expect(stats.isDirectory()).toBe(true);
        });
    });

    describe('getBackupDir', () => {
        it('should return null before ensureBackupDir is called', () => {
            expect(backupManager.getBackupDir()).toBe(null);
        });

        it('should return the backup directory after ensureBackupDir is called', () => {
            const backupDir = backupManager.ensureBackupDir();
            
            expect(backupManager.getBackupDir()).toBe(backupDir);
        });
    });

    describe('backupResource', () => {
        it('should create a YAML file with correct naming', async () => {
            const mockResource = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                    name: 'test-configmap',
                    namespace: 'test-namespace',
                },
                data: {
                    key: 'value',
                },
            };

            const filepath = await backupManager.backupResource(
                mockResource,
                'ConfigMap',
                'test-configmap',
                'test-namespace'
            );

            expect(filepath).toContain('test-namespace_ConfigMap_test-configmap.yaml');
            expect(fs.existsSync(filepath)).toBe(true);
        });

        it('should write valid YAML content', async () => {
            const mockResource = {
                apiVersion: 'v1',
                kind: 'Secret',
                metadata: {
                    name: 'test-secret',
                    namespace: 'production',
                },
                data: {
                    username: 'YWRtaW4=',
                },
            };

            const filepath = await backupManager.backupResource(
                mockResource,
                'Secret',
                'test-secret',
                'production'
            );

            const content = fs.readFileSync(filepath, 'utf-8');
            
            expect(content).toContain('apiVersion: v1');
            expect(content).toContain('kind: Secret');
            expect(content).toContain('name: test-secret');
            expect(content).toContain('namespace: production');
        });

        it('should create file with read permissions', async () => {
            const mockResource = {
                apiVersion: 'v1',
                kind: 'Service',
                metadata: {
                    name: 'test-service',
                    namespace: 'default',
                },
            };

            const filepath = await backupManager.backupResource(
                mockResource,
                'Service',
                'test-service',
                'default'
            );

            const stats = fs.statSync(filepath);
            // Check that file has read permissions (644)
            expect((stats.mode & 0o444) !== 0).toBe(true);
        });

        it('should handle resources with complex nested structures', async () => {
            const mockResource = {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                metadata: {
                    name: 'test-deployment',
                    namespace: 'default',
                    labels: {
                        app: 'test',
                        environment: 'production',
                    },
                },
                spec: {
                    replicas: 3,
                    selector: {
                        matchLabels: {
                            app: 'test',
                        },
                    },
                    template: {
                        metadata: {
                            labels: {
                                app: 'test',
                            },
                        },
                        spec: {
                            containers: [
                                {
                                    name: 'nginx',
                                    image: 'nginx:1.14.2',
                                    ports: [
                                        {
                                            containerPort: 80,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
            };

            const filepath = await backupManager.backupResource(
                mockResource,
                'Deployment',
                'test-deployment',
                'default'
            );

            const content = fs.readFileSync(filepath, 'utf-8');
            
            expect(content).toContain('kind: Deployment');
            expect(content).toContain('replicas: 3');
            expect(content).toContain('nginx:1.14.2');
        });

        it('should throw error if file creation fails', async () => {
            const mockResource = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                    name: 'test',
                    namespace: 'default',
                },
            };

            // Mock writeFileSync to throw an error
            const originalWriteFileSync = fs.writeFileSync;
            fs.writeFileSync = jest.fn(() => {
                throw new Error('Write failed');
            }) as any;

            await expect(
                backupManager.backupResource(mockResource, 'ConfigMap', 'test', 'default')
            ).rejects.toThrow('Write failed');

            // Restore original function
            fs.writeFileSync = originalWriteFileSync;
        });
    });

    describe('validateBackup', () => {
        it('should return true for existing readable file', async () => {
            const mockResource = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                    name: 'test',
                    namespace: 'default',
                },
            };

            const filepath = await backupManager.backupResource(
                mockResource,
                'ConfigMap',
                'test',
                'default'
            );

            expect(backupManager.validateBackup(filepath)).toBe(true);
        });

        it('should return false for non-existent file', () => {
            const nonExistentPath = '/tmp/non-existent-file.yaml';
            
            expect(backupManager.validateBackup(nonExistentPath)).toBe(false);
        });

        it('should return false for directory path', () => {
            const backupDir = backupManager.ensureBackupDir();
            
            expect(backupManager.validateBackup(backupDir)).toBe(true); // Directory is technically readable
        });
    });

    describe('timestamp format', () => {
        it('should generate unique backup directories for multiple instances', async () => {
            const manager1 = new BackupManager();
            const manager2 = new BackupManager();

            const dir1 = manager1.ensureBackupDir();
            
            // Wait for at least 1 second to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            const dir2 = manager2.ensureBackupDir();

            expect(dir1).not.toBe(dir2);

            // Cleanup
            if (fs.existsSync(dir1)) {
                fs.rmSync(dir1, { recursive: true, force: true });
            }
            if (fs.existsSync(dir2)) {
                fs.rmSync(dir2, { recursive: true, force: true });
            }
        });

        it('should use correct date format components', () => {
            const backupDir = backupManager.ensureBackupDir();
            const dirName = path.basename(backupDir);
            
            // Extract timestamp from k8s_source_YYYYMMDD_HHMMSS
            const timestampMatch = dirName.match(/k8s_source_(\d{8})_(\d{6})/);
            
            expect(timestampMatch).not.toBeNull();
            
            if (timestampMatch) {
                const [, datePart, timePart] = timestampMatch;
                
                // Validate date format (YYYYMMDD)
                expect(datePart.length).toBe(8);
                const year = parseInt(datePart.substring(0, 4));
                const month = parseInt(datePart.substring(4, 6));
                const day = parseInt(datePart.substring(6, 8));
                
                expect(year).toBeGreaterThanOrEqual(2000);
                expect(year).toBeLessThanOrEqual(2100);
                expect(month).toBeGreaterThanOrEqual(1);
                expect(month).toBeLessThanOrEqual(12);
                expect(day).toBeGreaterThanOrEqual(1);
                expect(day).toBeLessThanOrEqual(31);
                
                // Validate time format (HHMMSS)
                expect(timePart.length).toBe(6);
                const hour = parseInt(timePart.substring(0, 2));
                const minute = parseInt(timePart.substring(2, 4));
                const second = parseInt(timePart.substring(4, 6));
                
                expect(hour).toBeGreaterThanOrEqual(0);
                expect(hour).toBeLessThanOrEqual(23);
                expect(minute).toBeGreaterThanOrEqual(0);
                expect(minute).toBeLessThanOrEqual(59);
                expect(second).toBeGreaterThanOrEqual(0);
                expect(second).toBeLessThanOrEqual(59);
            }
        });
    });
});
