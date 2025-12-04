import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ResourceHandlerFactory, DeleteHandlerFactory } from '../src/resource-handlers.js';
import { ResourceType } from '../src/types.js';
import { K8sClient } from '../src/k8s.js';
import { UI } from '../src/ui.js';

jest.mock('../src/k8s.js');
jest.mock('../src/ui.js');

describe('ResourceHandlerFactory', () => {
    let sourceClient: K8sClient;
    let destClient: K8sClient;
    let ui: UI;
    let sourceCoreApi: any;
    let destCoreApi: any;
    let sourceAppsApi: any;
    let destAppsApi: any;

    beforeEach(() => {
        jest.clearAllMocks();

        sourceClient = new K8sClient();
        destClient = new K8sClient();
        ui = new UI();

        sourceCoreApi = {
            readNamespacedConfigMap: jest.fn(),
            createNamespacedConfigMap: jest.fn(),
            readNamespacedSecret: jest.fn(),
            createNamespacedSecret: jest.fn(),
            readNamespacedService: jest.fn(),
            createNamespacedService: jest.fn(),
        };

        destCoreApi = {
            createNamespacedConfigMap: jest.fn(),
            createNamespacedSecret: jest.fn(),
            createNamespacedService: jest.fn(),
        };

        sourceAppsApi = {
            readNamespacedDeployment: jest.fn(),
        };

        destAppsApi = {
            createNamespacedDeployment: jest.fn(),
        };

        (sourceClient.getCoreApi as jest.Mock) = jest.fn().mockReturnValue(sourceCoreApi);
        (sourceClient.getAppsApi as jest.Mock) = jest.fn().mockReturnValue(sourceAppsApi);
        (destClient.getCoreApi as jest.Mock) = jest.fn().mockReturnValue(destCoreApi);
        (destClient.getAppsApi as jest.Mock) = jest.fn().mockReturnValue(destAppsApi);

        (ui.logInfo as jest.Mock) = jest.fn();
        (ui.logSuccess as jest.Mock) = jest.fn();
        (ui.logError as jest.Mock) = jest.fn();
    });

    describe('createMigrationHandlers', () => {
        it('should create handlers for all resource types', () => {
            const handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);

            expect(handlers.size).toBe(4);
            expect(handlers.has(ResourceType.ConfigMap)).toBe(true);
            expect(handlers.has(ResourceType.Secret)).toBe(true);
            expect(handlers.has(ResourceType.Service)).toBe(true);
            expect(handlers.has(ResourceType.Deployment)).toBe(true);
        });

        it('ConfigMapHandler should migrate ConfigMaps', async () => {
            const handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);
            const handler = handlers.get(ResourceType.ConfigMap)!;

            const mockCm = {
                metadata: { name: 'test-cm', namespace: 'source' },
                data: { key: 'value' },
            };

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockCm);
            destCoreApi.createNamespacedConfigMap.mockResolvedValue({});

            await handler.migrate('test-cm', 'source', 'dest');

            expect(sourceCoreApi.readNamespacedConfigMap).toHaveBeenCalledWith({
                name: 'test-cm',
                namespace: 'source',
            });
            expect(destCoreApi.createNamespacedConfigMap).toHaveBeenCalled();
            expect(ui.logSuccess).toHaveBeenCalledWith('ConfigMap test-cm migrated.');
        });

        it('SecretHandler should migrate Secrets', async () => {
            const handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);
            const handler = handlers.get(ResourceType.Secret)!;

            const mockSecret = {
                metadata: { name: 'test-secret', namespace: 'source' },
                data: { key: 'dmFsdWU=' },
            };

            sourceCoreApi.readNamespacedSecret.mockResolvedValue(mockSecret);
            destCoreApi.createNamespacedSecret.mockResolvedValue({});

            await handler.migrate('test-secret', 'source', 'dest');

            expect(sourceCoreApi.readNamespacedSecret).toHaveBeenCalledWith({
                name: 'test-secret',
                namespace: 'source',
            });
            expect(destCoreApi.createNamespacedSecret).toHaveBeenCalled();
            expect(ui.logSuccess).toHaveBeenCalledWith('Secret test-secret migrated.');
        });

        it('ServiceHandler should migrate Services', async () => {
            const handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);
            const handler = handlers.get(ResourceType.Service)!;

            const mockService = {
                kind: 'Service',
                metadata: { name: 'test-svc', namespace: 'source' },
                spec: { ports: [{ port: 80 }] },
            };

            sourceCoreApi.readNamespacedService.mockResolvedValue(mockService);
            destCoreApi.createNamespacedService.mockResolvedValue({});

            await handler.migrate('test-svc', 'source', 'dest');

            expect(sourceCoreApi.readNamespacedService).toHaveBeenCalledWith({
                name: 'test-svc',
                namespace: 'source',
            });
            expect(destCoreApi.createNamespacedService).toHaveBeenCalled();
            expect(ui.logSuccess).toHaveBeenCalledWith('Service test-svc migrated.');
        });

        it('DeploymentHandler should migrate Deployments', async () => {
            const handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);
            const handler = handlers.get(ResourceType.Deployment)!;

            const mockDeployment = {
                metadata: { name: 'test-dep', namespace: 'source' },
                spec: { replicas: 1 },
            };

            sourceAppsApi.readNamespacedDeployment.mockResolvedValue(mockDeployment);
            destAppsApi.createNamespacedDeployment.mockResolvedValue({});

            await handler.migrate('test-dep', 'source', 'dest');

            expect(sourceAppsApi.readNamespacedDeployment).toHaveBeenCalledWith({
                name: 'test-dep',
                namespace: 'source',
            });
            expect(destAppsApi.createNamespacedDeployment).toHaveBeenCalled();
            expect(ui.logSuccess).toHaveBeenCalledWith('Deployment test-dep migrated.');
        });

        it('should handle AlreadyExists error', async () => {
            const handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);
            const handler = handlers.get(ResourceType.ConfigMap)!;

            const mockCm = { metadata: { name: 'test-cm' }, data: {} };
            const alreadyExistsError = { body: { reason: 'AlreadyExists' } };

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockCm);
            destCoreApi.createNamespacedConfigMap.mockRejectedValue(alreadyExistsError);

            await handler.migrate('test-cm', 'source', 'dest');

            expect(ui.logError).toHaveBeenCalledWith(
                expect.stringContaining("'test-cm' already exists")
            );
        });

        it('should handle general errors', async () => {
            const handlers = ResourceHandlerFactory.createMigrationHandlers(sourceClient, destClient, ui);
            const handler = handlers.get(ResourceType.ConfigMap)!;

            const mockCm = { metadata: { name: 'test-cm' }, data: {} };
            const error = new Error('Network error');

            sourceCoreApi.readNamespacedConfigMap.mockResolvedValue(mockCm);
            destCoreApi.createNamespacedConfigMap.mockRejectedValue(error);

            await handler.migrate('test-cm', 'source', 'dest');

            expect(ui.logError).toHaveBeenCalledWith(
                expect.stringContaining('Failed to migrate ConfigMap test-cm')
            );
        });
    });
});

describe('DeleteHandlerFactory', () => {
    let client: K8sClient;
    let ui: UI;
    let coreApi: any;
    let appsApi: any;

    beforeEach(() => {
        jest.clearAllMocks();

        client = new K8sClient();
        ui = new UI();

        coreApi = {
            deleteNamespacedConfigMap: jest.fn(),
            deleteNamespacedSecret: jest.fn(),
            deleteNamespacedService: jest.fn(),
            deleteNamespacedPersistentVolumeClaim: jest.fn(),
        };

        appsApi = {
            deleteNamespacedDeployment: jest.fn(),
        };

        (client.getCoreApi as jest.Mock) = jest.fn().mockReturnValue(coreApi);
        (client.getAppsApi as jest.Mock) = jest.fn().mockReturnValue(appsApi);

        (ui.logInfo as jest.Mock) = jest.fn();
        (ui.logSuccess as jest.Mock) = jest.fn();
        (ui.logError as jest.Mock) = jest.fn();
    });

    describe('createDeleteHandlers', () => {
        it('should create handlers for all resource types', () => {
            const handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);

            expect(handlers.size).toBe(5);
            expect(handlers.has(ResourceType.Deployment)).toBe(true);
            expect(handlers.has(ResourceType.Service)).toBe(true);
            expect(handlers.has(ResourceType.PVC)).toBe(true);
            expect(handlers.has(ResourceType.ConfigMap)).toBe(true);
            expect(handlers.has(ResourceType.Secret)).toBe(true);
        });

        it('ConfigMapDeleteHandler should delete ConfigMaps', async () => {
            const handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);
            const handler = handlers.get(ResourceType.ConfigMap)!;

            coreApi.deleteNamespacedConfigMap.mockResolvedValue({});

            await handler.delete('test-cm', 'test-ns');

            expect(coreApi.deleteNamespacedConfigMap).toHaveBeenCalledWith({
                name: 'test-cm',
                namespace: 'test-ns',
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('ConfigMap test-cm deleted.');
        });

        it('SecretDeleteHandler should delete Secrets', async () => {
            const handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);
            const handler = handlers.get(ResourceType.Secret)!;

            coreApi.deleteNamespacedSecret.mockResolvedValue({});

            await handler.delete('test-secret', 'test-ns');

            expect(coreApi.deleteNamespacedSecret).toHaveBeenCalledWith({
                name: 'test-secret',
                namespace: 'test-ns',
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('Secret test-secret deleted.');
        });

        it('ServiceDeleteHandler should delete Services', async () => {
            const handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);
            const handler = handlers.get(ResourceType.Service)!;

            coreApi.deleteNamespacedService.mockResolvedValue({});

            await handler.delete('test-svc', 'test-ns');

            expect(coreApi.deleteNamespacedService).toHaveBeenCalledWith({
                name: 'test-svc',
                namespace: 'test-ns',
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('Service test-svc deleted.');
        });

        it('DeploymentDeleteHandler should delete Deployments', async () => {
            const handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);
            const handler = handlers.get(ResourceType.Deployment)!;

            appsApi.deleteNamespacedDeployment.mockResolvedValue({});

            await handler.delete('test-dep', 'test-ns');

            expect(appsApi.deleteNamespacedDeployment).toHaveBeenCalledWith({
                name: 'test-dep',
                namespace: 'test-ns',
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('Deployment test-dep deleted.');
        });

        it('PVCDeleteHandler should delete PVCs', async () => {
            const handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);
            const handler = handlers.get(ResourceType.PVC)!;

            coreApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({});

            await handler.delete('test-pvc', 'test-ns');

            expect(coreApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith({
                name: 'test-pvc',
                namespace: 'test-ns',
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('PVC test-pvc deleted.');
        });

        it('should handle deletion errors', async () => {
            const handlers = DeleteHandlerFactory.createDeleteHandlers(client, ui);
            const handler = handlers.get(ResourceType.ConfigMap)!;

            const error = new Error('Delete failed');
            coreApi.deleteNamespacedConfigMap.mockRejectedValue(error);

            await handler.delete('test-cm', 'test-ns');

            expect(ui.logError).toHaveBeenCalledWith(
                expect.stringContaining('Failed to delete ConfigMap test-cm')
            );
        });
    });
});
