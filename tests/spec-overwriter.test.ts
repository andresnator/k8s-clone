import { describe, it, expect } from '@jest/globals';
import { deepMerge, applyOverwriteSpec } from '../src/spec-overwriter.js';

describe('spec-overwriter', () => {
    describe('deepMerge', () => {
        it('should merge simple properties', () => {
            const target = { a: 1, b: 2 };
            const overwrite = { b: 3 };
            
            deepMerge(target, overwrite);
            
            expect(target).toEqual({ a: 1, b: 3 });
        });

        it('should add new properties', () => {
            const target = { a: 1 };
            const overwrite = { b: 2 };
            
            deepMerge(target, overwrite);
            
            expect(target).toEqual({ a: 1, b: 2 });
        });

        it('should merge nested objects', () => {
            const target = {
                spec: {
                    replicas: 1,
                    template: {
                        metadata: { labels: { app: 'test' } }
                    }
                }
            };
            const overwrite = {
                spec: {
                    replicas: 3
                }
            };
            
            deepMerge(target, overwrite);
            
            expect(target).toEqual({
                spec: {
                    replicas: 3,
                    template: {
                        metadata: { labels: { app: 'test' } }
                    }
                }
            });
        });

        it('should merge deeply nested objects', () => {
            const target = {
                spec: {
                    template: {
                        spec: {
                            resources: {
                                limits: { memory: '256Mi' },
                                requests: { memory: '128Mi' }
                            }
                        }
                    }
                }
            };
            const overwrite = {
                spec: {
                    template: {
                        spec: {
                            resources: {
                                limits: { memory: '512Mi' }
                            }
                        }
                    }
                }
            };
            
            deepMerge(target, overwrite);
            
            expect(target.spec.template.spec.resources.limits.memory).toBe('512Mi');
            expect(target.spec.template.spec.resources.requests.memory).toBe('128Mi');
        });

        it('should replace arrays entirely', () => {
            const target = { items: [1, 2, 3] };
            const overwrite = { items: [4, 5] };
            
            deepMerge(target, overwrite);
            
            expect(target.items).toEqual([4, 5]);
        });

        it('should handle null values', () => {
            const target = { a: 'test', b: 'value' };
            const overwrite = { b: null };
            
            deepMerge(target, overwrite);
            
            expect(target).toEqual({ a: 'test', b: null });
        });

        it('should not modify unspecified properties', () => {
            const target = { a: 1, b: 2, c: 3 };
            const overwrite = { b: 20 };
            
            deepMerge(target, overwrite);
            
            expect(target).toEqual({ a: 1, b: 20, c: 3 });
        });

        it('should handle nested property overwrite without affecting siblings', () => {
            const target = {
                spec: {
                    capacity: {
                        storage: '1Gi'
                    },
                    accessModes: ['ReadWriteOnce']
                }
            };
            const overwrite = {
                spec: {
                    capacity: {
                        storage: '10Gi'
                    }
                }
            };
            
            deepMerge(target, overwrite);
            
            expect(target).toEqual({
                spec: {
                    capacity: {
                        storage: '10Gi'
                    },
                    accessModes: ['ReadWriteOnce']
                }
            });
        });

        it('should prevent prototype pollution via __proto__', () => {
            const target = { a: 1 };
            const overwrite = JSON.parse('{"__proto__": {"polluted": "yes"}}');
            
            deepMerge(target, overwrite);
            
            // Verify prototype was not polluted
            expect((target as any).polluted).toBeUndefined();
            expect(Object.prototype.hasOwnProperty.call(target, '__proto__')).toBe(false);
        });

        it('should prevent prototype pollution via constructor', () => {
            const target = { a: 1 };
            const overwrite = { constructor: { polluted: 'yes' } };
            
            deepMerge(target, overwrite);
            
            // Verify constructor was not modified
            expect((target as any).polluted).toBeUndefined();
            expect(target.constructor).toBe(Object);
        });

        it('should prevent prototype pollution via prototype', () => {
            const target = { a: 1 };
            const overwrite = { prototype: { polluted: 'yes' } };
            
            deepMerge(target, overwrite);
            
            // Verify prototype property was not set
            expect((target as any).prototype).toBeUndefined();
        });
    });

    describe('applyOverwriteSpec', () => {
        it('should apply overwrite to resource spec', () => {
            const resource = {
                apiVersion: 'v1',
                kind: 'Service',
                metadata: { name: 'test-service' },
                spec: {
                    type: 'ClusterIP',
                    ports: [{ port: 80 }]
                }
            };
            const overwriteSpec = {
                type: 'LoadBalancer'
            };
            
            applyOverwriteSpec(resource, overwriteSpec);
            
            expect(resource.spec.type).toBe('LoadBalancer');
            expect(resource.spec.ports).toEqual([{ port: 80 }]);
        });

        it('should create spec if it does not exist', () => {
            const resource = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: { name: 'test-cm' }
            };
            const overwriteSpec = {
                data: { key: 'value' }
            };
            
            applyOverwriteSpec(resource, overwriteSpec);
            
            expect(resource.spec).toEqual({
                data: { key: 'value' }
            });
        });

        it('should apply nested overwrite-spec to deployment', () => {
            const resource = {
                apiVersion: 'apps/v1',
                kind: 'Deployment',
                metadata: { name: 'test-deployment' },
                spec: {
                    replicas: 1,
                    selector: {
                        matchLabels: { app: 'test' }
                    }
                }
            };
            const overwriteSpec = {
                replicas: 5
            };
            
            applyOverwriteSpec(resource, overwriteSpec);
            
            expect(resource.spec.replicas).toBe(5);
            expect(resource.spec.selector).toEqual({ matchLabels: { app: 'test' } });
        });

        it('should apply nested overwrite-spec to PVC', () => {
            const resource = {
                apiVersion: 'v1',
                kind: 'PersistentVolumeClaim',
                metadata: { name: 'test-pvc' },
                spec: {
                    accessModes: ['ReadWriteOnce'],
                    resources: {
                        requests: {
                            storage: '1Gi'
                        }
                    }
                }
            };
            const overwriteSpec = {
                resources: {
                    requests: {
                        storage: '10Gi'
                    }
                }
            };
            
            applyOverwriteSpec(resource, overwriteSpec);
            
            expect(resource.spec.resources.requests.storage).toBe('10Gi');
            expect(resource.spec.accessModes).toEqual(['ReadWriteOnce']);
        });

        it('should return the modified resource', () => {
            const resource = {
                apiVersion: 'v1',
                kind: 'Service',
                metadata: { name: 'test' },
                spec: { type: 'ClusterIP' }
            };
            const overwriteSpec = { type: 'NodePort' };
            
            const result = applyOverwriteSpec(resource, overwriteSpec);
            
            expect(result).toBe(resource);
            expect(result.spec.type).toBe('NodePort');
        });
    });
});
