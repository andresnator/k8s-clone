import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MetadataCleaner } from '../src/metadata-cleaner.js';

describe('MetadataCleaner', () => {
    describe('clean', () => {
        it('should preserve name, labels, and annotations', () => {
            const obj = {
                metadata: {
                    name: 'test-resource',
                    namespace: 'source-ns',
                    labels: { app: 'test' },
                    annotations: { note: 'test note' },
                    uid: 'uid-123',
                    resourceVersion: 'rv-123',
                },
            };

            const result = MetadataCleaner.clean(obj, 'dest-ns');

            expect(result.metadata.name).toBe('test-resource');
            expect(result.metadata.namespace).toBe('dest-ns');
            expect(result.metadata.labels).toEqual({ app: 'test' });
            expect(result.metadata.annotations).toEqual({ note: 'test note' });
        });

        it('should remove system-managed fields', () => {
            const obj = {
                metadata: {
                    name: 'test-resource',
                    namespace: 'source-ns',
                    uid: 'uid-123',
                    resourceVersion: 'rv-123',
                    creationTimestamp: new Date(),
                    selfLink: '/api/v1/test',
                    generation: 1,
                    ownerReferences: [{ name: 'owner' }],
                    managedFields: [{ manager: 'test' }],
                },
            };

            const result = MetadataCleaner.clean(obj, 'dest-ns');

            expect(result.metadata.uid).toBeUndefined();
            expect(result.metadata.resourceVersion).toBeUndefined();
            expect(result.metadata.creationTimestamp).toBeUndefined();
            expect(result.metadata.selfLink).toBeUndefined();
            expect(result.metadata.generation).toBeUndefined();
            expect(result.metadata.ownerReferences).toBeUndefined();
            expect(result.metadata.managedFields).toBeUndefined();
        });

        it('should remove status field', () => {
            const obj = {
                metadata: { name: 'test' },
                status: { phase: 'Running' },
            };

            const result = MetadataCleaner.clean(obj, 'dest-ns');

            expect(result.status).toBeUndefined();
        });

        it('should remove clusterIP for Service resources', () => {
            const obj = {
                kind: 'Service',
                metadata: { name: 'test-service' },
                spec: {
                    clusterIP: '10.0.0.1',
                    clusterIPs: ['10.0.0.1'],
                    ports: [{ port: 80 }],
                },
            };

            const result = MetadataCleaner.clean(obj, 'dest-ns');

            expect(result.spec.clusterIP).toBeUndefined();
            expect(result.spec.clusterIPs).toBeUndefined();
            expect(result.spec.ports).toBeDefined();
        });

        it('should not modify non-Service resources spec', () => {
            const obj = {
                kind: 'ConfigMap',
                metadata: { name: 'test-cm' },
                data: { key: 'value' },
            };

            const result = MetadataCleaner.clean(obj, 'dest-ns');

            expect(result.data).toEqual({ key: 'value' });
        });

        it('should handle objects without metadata', () => {
            const obj = { data: { key: 'value' } };

            const result = MetadataCleaner.clean(obj, 'dest-ns');

            expect(result.metadata).toBeDefined();
            expect(result.metadata.namespace).toBe('dest-ns');
        });
    });

    describe('cleanPersistentVolume', () => {
        it('should set the new name', () => {
            const obj = {
                metadata: { name: 'old-pv' },
                spec: {
                    capacity: { storage: '1Gi' },
                    claimRef: { name: 'old-pvc' },
                },
            };

            const result = MetadataCleaner.cleanPersistentVolume(obj, 'new-pv-name');

            expect(result.metadata.name).toBe('new-pv-name');
        });

        it('should clear claimRef', () => {
            const obj = {
                metadata: { name: 'old-pv' },
                spec: {
                    capacity: { storage: '1Gi' },
                    claimRef: { name: 'old-pvc', namespace: 'source' },
                },
            };

            const result = MetadataCleaner.cleanPersistentVolume(obj, 'new-pv');

            expect(result.spec.claimRef).toBeUndefined();
        });

        it('should handle PV without spec', () => {
            const obj = {
                metadata: { name: 'old-pv' },
            };

            const result = MetadataCleaner.cleanPersistentVolume(obj, 'new-pv');

            expect(result.metadata.name).toBe('new-pv');
        });
    });

    describe('cleanPVC', () => {
        it('should remove volumeName by default for dynamic provisioning', () => {
            const obj = {
                metadata: { name: 'test-pvc' },
                spec: {
                    accessModes: ['ReadWriteOnce'],
                    volumeName: 'pv-123',
                    storageClassName: 'standard',
                },
                status: { phase: 'Bound' },
            };

            const result = MetadataCleaner.cleanPVC(obj, 'dest-ns');

            expect(result.spec.volumeName).toBeUndefined();
            expect(result.status).toBeUndefined();
        });

        it('should keep volumeName when keepVolumeName is true', () => {
            const obj = {
                metadata: { name: 'test-pvc' },
                spec: {
                    accessModes: ['ReadWriteOnce'],
                    volumeName: 'manual-pv',
                    storageClassName: 'manual',
                },
            };

            const result = MetadataCleaner.cleanPVC(obj, 'dest-ns', true);

            expect(result.spec.volumeName).toBe('manual-pv');
        });

        it('should set the target namespace', () => {
            const obj = {
                metadata: { name: 'test-pvc', namespace: 'source' },
                spec: { accessModes: ['ReadWriteOnce'] },
            };

            const result = MetadataCleaner.cleanPVC(obj, 'dest-ns');

            expect(result.metadata.namespace).toBe('dest-ns');
        });
    });
});
