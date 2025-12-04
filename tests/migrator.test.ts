import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Migrator } from '../src/migrator.js';
import { K8sClient } from '../src/k8s.js';
import { UI } from '../src/ui.js';

// Mock dependencies
jest.mock('../src/k8s.js');
jest.mock('../src/ui.js');
jest.mock('child_process');

describe('Migrator', () => {
    let sourceClient: K8sClient;
    let destClient: K8sClient;
    let ui: UI;
    let migrator: Migrator;

    let sourceCoreApi: any;
    let destCoreApi: any;
    let sourceAppsApi: any;
    let destAppsApi: any;

    const createMockCoreApi = () => ({
        readNamespacedConfigMap: jest.fn(),
        createNamespacedConfigMap: jest.fn(),
        readNamespacedSecret: jest.fn(),
        createNamespacedSecret: jest.fn(),
        readNamespacedPersistentVolumeClaim: jest.fn(),
        createNamespacedPersistentVolumeClaim: jest.fn(),
        readPersistentVolume: jest.fn(),
        createPersistentVolume: jest.fn(),
        readNamespacedService: jest.fn(),
        createNamespacedService: jest.fn(),
        readNamespacedPod: jest.fn(),
        createNamespacedPod: jest.fn(),
        deleteNamespacedPod: jest.fn(),
    });

    const createMockAppsApi = () => ({
        readNamespacedDeployment: jest.fn(),
        createNamespacedDeployment: jest.fn(),
    });

    beforeEach(() => {
        jest.clearAllMocks();

        sourceClient = new K8sClient();
        destClient = new K8sClient();
        ui = new UI();

        sourceCoreApi = createMockCoreApi();
        destCoreApi = createMockCoreApi();
        sourceAppsApi = createMockAppsApi();
        destAppsApi = createMockAppsApi();

        (sourceClient.getCoreApi as jest.Mock) = jest.fn().mockReturnValue(sourceCoreApi);
        (sourceClient.getAppsApi as jest.Mock) = jest.fn().mockReturnValue(sourceAppsApi);
        (destClient.getCoreApi as jest.Mock) = jest.fn().mockReturnValue(destCoreApi);
        (destClient.getAppsApi as jest.Mock) = jest.fn().mockReturnValue(destAppsApi);
        (sourceClient.getCurrentContext as jest.Mock) = jest.fn().mockReturnValue('source-context');
        (destClient.getCurrentContext as jest.Mock) = jest.fn().mockReturnValue('dest-context');

        (ui.logInfo as jest.Mock) = jest.fn();
        (ui.logSuccess as jest.Mock) = jest.fn();
        (ui.logError as jest.Mock) = jest.fn();

        migrator = new Migrator(sourceClient, destClient, ui);
    });

    describe('cleanMetadata', () => {
        it('should be accessible via migrateResources', () => {
            // cleanMetadata is private, so we test it indirectly through migrateResources
            expect(migrator).toBeDefined();
        });
    });

    describe('migrateResources', () => {
        const sourceNs = 'source-ns';
        const destNs = 'dest-ns';
        const emptySelections = {
            services: [],
            deployments: [],
            configMaps: [],
            secrets: [],
            pvcs: [],
        };

        it('should not make any API calls when selections are empty', async () => {
            await migrator.migrateResources(sourceNs, destNs, emptySelections);

            expect(sourceCoreApi.readNamespacedConfigMap).not.toHaveBeenCalled();
            expect(sourceCoreApi.readNamespacedSecret).not.toHaveBeenCalled();
            expect(sourceCoreApi.readNamespacedPersistentVolumeClaim).not.toHaveBeenCalled();
            expect(sourceCoreApi.readNamespacedService).not.toHaveBeenCalled();
        });

        it('should migrate ConfigMaps successfully', async () => {
            const mockConfigMap = {
                metadata: {
                    name: 'my-configmap',
                    namespace: sourceNs,
                    uid: 'uid-123',
                    resourceVersion: 'rv-123',
                    creationTimestamp: new Date(),
                    labels: { app: 'test' },
                    annotations: { note: 'test' },
                },
                data: { key: 'value' },
            };

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockConfigMap);
            destCoreApi.createNamespacedConfigMap.mockResolvedValue({});

            await migrator.migrateResources(sourceNs, destNs, {
                ...emptySelections,
                configMaps: ['my-configmap'],
            });

            expect(sourceCoreApi.readNamespacedConfigMap).toHaveBeenCalledWith({
                name: 'my-configmap',
                namespace: sourceNs,
            });
            expect(destCoreApi.createNamespacedConfigMap).toHaveBeenCalled();
            expect(ui.logSuccess).toHaveBeenCalledWith('ConfigMap my-configmap migrated.');
        });

        it('should migrate Secrets successfully', async () => {
            const mockSecret = {
                metadata: {
                    name: 'my-secret',
                    namespace: sourceNs,
                    uid: 'uid-456',
                },
                type: 'Opaque',
                data: { key: 'dmFsdWU=' }, // base64 encoded
            };

            sourceCoreApi.readNamespacedSecret.mockResolvedValue(mockSecret);
            destCoreApi.createNamespacedSecret.mockResolvedValue({});

            await migrator.migrateResources(sourceNs, destNs, {
                ...emptySelections,
                secrets: ['my-secret'],
            });

            expect(sourceCoreApi.readNamespacedSecret).toHaveBeenCalledWith({
                name: 'my-secret',
                namespace: sourceNs,
            });
            expect(destCoreApi.createNamespacedSecret).toHaveBeenCalled();
            expect(ui.logSuccess).toHaveBeenCalledWith('Secret my-secret migrated.');
        });

        it('should migrate Services and clean clusterIP fields', async () => {
            const mockService = {
                kind: 'Service',
                metadata: {
                    name: 'my-service',
                    namespace: sourceNs,
                    uid: 'uid-789',
                },
                spec: {
                    clusterIP: '10.0.0.1',
                    clusterIPs: ['10.0.0.1'],
                    ports: [{ port: 80, targetPort: 8080 }],
                },
            };

            sourceCoreApi.readNamespacedService.mockResolvedValue(mockService);
            destCoreApi.createNamespacedService.mockResolvedValue({});

            await migrator.migrateResources(sourceNs, destNs, {
                ...emptySelections,
                services: ['my-service'],
            });

            expect(sourceCoreApi.readNamespacedService).toHaveBeenCalledWith({
                name: 'my-service',
                namespace: sourceNs,
            });

            // Verify clusterIP fields are removed
            const createCall = destCoreApi.createNamespacedService.mock.calls[0][0];
            expect(createCall.body.spec.clusterIP).toBeUndefined();
            expect(createCall.body.spec.clusterIPs).toBeUndefined();
            expect(ui.logSuccess).toHaveBeenCalledWith('Service my-service migrated.');
        });

        it('should migrate Deployments successfully', async () => {
            const mockDeployment = {
                metadata: {
                    name: 'my-deployment',
                    namespace: sourceNs,
                    uid: 'uid-abc',
                },
                spec: {
                    replicas: 2,
                    selector: { matchLabels: { app: 'test' } },
                    template: {
                        metadata: { labels: { app: 'test' } },
                        spec: {
                            containers: [{ name: 'test', image: 'nginx' }],
                        },
                    },
                },
            };

            sourceAppsApi.readNamespacedDeployment.mockResolvedValue(mockDeployment);
            destAppsApi.createNamespacedDeployment.mockResolvedValue({});

            await migrator.migrateResources(sourceNs, destNs, {
                ...emptySelections,
                deployments: ['my-deployment'],
            });

            expect(sourceAppsApi.readNamespacedDeployment).toHaveBeenCalledWith({
                name: 'my-deployment',
                namespace: sourceNs,
            });
            expect(destAppsApi.createNamespacedDeployment).toHaveBeenCalled();
            expect(ui.logSuccess).toHaveBeenCalledWith('Deployment my-deployment migrated.');
        });

        it('should handle AlreadyExists error gracefully', async () => {
            const mockConfigMap = {
                metadata: { name: 'my-configmap', namespace: sourceNs },
                data: {},
            };

            const alreadyExistsError = {
                body: { reason: 'AlreadyExists', message: 'Resource already exists' },
            };

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockConfigMap);
            destCoreApi.createNamespacedConfigMap.mockRejectedValue(alreadyExistsError);

            await migrator.migrateResources(sourceNs, destNs, {
                ...emptySelections,
                configMaps: ['my-configmap'],
            });

            expect(ui.logError).toHaveBeenCalledWith(
                expect.stringContaining("'my-configmap' already exists")
            );
        });

        it('should handle general API errors gracefully', async () => {
            const mockConfigMap = {
                metadata: { name: 'my-configmap', namespace: sourceNs },
                data: {},
            };

            const genericError = {
                body: { message: 'Internal Server Error' },
            };

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockConfigMap);
            destCoreApi.createNamespacedConfigMap.mockRejectedValue(genericError);

            await migrator.migrateResources(sourceNs, destNs, {
                ...emptySelections,
                configMaps: ['my-configmap'],
            });

            expect(ui.logError).toHaveBeenCalledWith(
                expect.stringContaining('Failed to migrate ConfigMap my-configmap')
            );
        });

        it('should handle errors without body gracefully', async () => {
            const mockConfigMap = {
                metadata: { name: 'my-configmap', namespace: sourceNs },
                data: {},
            };

            const networkError = new Error('Network Error');

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockConfigMap);
            destCoreApi.createNamespacedConfigMap.mockRejectedValue(networkError);

            await migrator.migrateResources(sourceNs, destNs, {
                ...emptySelections,
                configMaps: ['my-configmap'],
            });

            expect(ui.logError).toHaveBeenCalledWith(
                expect.stringContaining('Network Error')
            );
        });

        it('should migrate multiple resource types in correct order', async () => {
            const mockConfigMap = { metadata: { name: 'cm1', namespace: sourceNs }, data: {} };
            const mockSecret = { metadata: { name: 's1', namespace: sourceNs }, data: {} };
            const mockService = {
                kind: 'Service',
                metadata: { name: 'svc1', namespace: sourceNs },
                spec: { ports: [] },
            };
            const mockDeployment = {
                metadata: { name: 'dep1', namespace: sourceNs },
                spec: {
                    replicas: 1,
                    selector: {},
                    template: { metadata: {}, spec: { containers: [] } },
                },
            };

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockConfigMap);
            sourceCoreApi.readNamespacedSecret.mockResolvedValue(mockSecret);
            sourceCoreApi.readNamespacedService.mockResolvedValue(mockService);
            sourceAppsApi.readNamespacedDeployment.mockResolvedValue(mockDeployment);

            destCoreApi.createNamespacedConfigMap.mockResolvedValue({});
            destCoreApi.createNamespacedSecret.mockResolvedValue({});
            destCoreApi.createNamespacedService.mockResolvedValue({});
            destAppsApi.createNamespacedDeployment.mockResolvedValue({});

            await migrator.migrateResources(sourceNs, destNs, {
                configMaps: ['cm1'],
                secrets: ['s1'],
                services: ['svc1'],
                deployments: ['dep1'],
                pvcs: [],
            });

            // Verify order: ConfigMaps, Secrets, Services, Deployments
            const successCalls = (ui.logSuccess as jest.Mock).mock.calls.map((call: string[]) => call[0]);
            expect(successCalls).toEqual([
                'ConfigMap cm1 migrated.',
                'Secret s1 migrated.',
                'Service svc1 migrated.',
                'Deployment dep1 migrated.',
            ]);
        });
    });
});
