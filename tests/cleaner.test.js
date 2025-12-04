import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Cleaner } from '../src/cleaner.js';
import { K8sClient } from '../src/k8s.js';
import { UI } from '../src/ui.js';
// Mock dependencies
jest.mock('../src/k8s.js');
jest.mock('../src/ui.js');
describe('Cleaner', () => {
    let client;
    let ui;
    let cleaner;
    let coreApi;
    let appsApi;
    const createMockCoreApi = () => ({
        deleteNamespacedService: jest.fn(),
        deleteNamespacedPersistentVolumeClaim: jest.fn(),
        deleteNamespacedConfigMap: jest.fn(),
        deleteNamespacedSecret: jest.fn(),
    });
    const createMockAppsApi = () => ({
        deleteNamespacedDeployment: jest.fn(),
    });
    beforeEach(() => {
        jest.clearAllMocks();
        client = new K8sClient();
        ui = new UI();
        coreApi = createMockCoreApi();
        appsApi = createMockAppsApi();
        client.getCoreApi = jest.fn().mockReturnValue(coreApi);
        client.getAppsApi = jest.fn().mockReturnValue(appsApi);
        ui.logInfo = jest.fn();
        ui.logSuccess = jest.fn();
        ui.logError = jest.fn();
        cleaner = new Cleaner(client, ui);
    });
    describe('cleanResources', () => {
        const namespace = 'test-ns';
        const emptySelections = {
            services: [],
            deployments: [],
            configMaps: [],
            secrets: [],
            pvcs: [],
        };
        it('should not make any API calls when selections are empty', async () => {
            await cleaner.cleanResources(namespace, emptySelections);
            expect(coreApi.deleteNamespacedService).not.toHaveBeenCalled();
            expect(coreApi.deleteNamespacedPersistentVolumeClaim).not.toHaveBeenCalled();
            expect(coreApi.deleteNamespacedConfigMap).not.toHaveBeenCalled();
            expect(coreApi.deleteNamespacedSecret).not.toHaveBeenCalled();
            expect(appsApi.deleteNamespacedDeployment).not.toHaveBeenCalled();
        });
        it('should delete Deployments successfully', async () => {
            appsApi.deleteNamespacedDeployment.mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                deployments: ['my-deployment'],
            });
            expect(appsApi.deleteNamespacedDeployment).toHaveBeenCalledWith({
                name: 'my-deployment',
                namespace,
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('Deployment my-deployment deleted.');
        });
        it('should delete Services successfully', async () => {
            coreApi.deleteNamespacedService.mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                services: ['my-service'],
            });
            expect(coreApi.deleteNamespacedService).toHaveBeenCalledWith({
                name: 'my-service',
                namespace,
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('Service my-service deleted.');
        });
        it('should delete PVCs successfully', async () => {
            coreApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                pvcs: ['my-pvc'],
            });
            expect(coreApi.deleteNamespacedPersistentVolumeClaim).toHaveBeenCalledWith({
                name: 'my-pvc',
                namespace,
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('PVC my-pvc deleted.');
        });
        it('should delete ConfigMaps successfully', async () => {
            coreApi.deleteNamespacedConfigMap.mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                configMaps: ['my-configmap'],
            });
            expect(coreApi.deleteNamespacedConfigMap).toHaveBeenCalledWith({
                name: 'my-configmap',
                namespace,
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('ConfigMap my-configmap deleted.');
        });
        it('should delete Secrets successfully', async () => {
            coreApi.deleteNamespacedSecret.mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                secrets: ['my-secret'],
            });
            expect(coreApi.deleteNamespacedSecret).toHaveBeenCalledWith({
                name: 'my-secret',
                namespace,
            });
            expect(ui.logSuccess).toHaveBeenCalledWith('Secret my-secret deleted.');
        });
        it('should handle deletion errors gracefully', async () => {
            const error = { body: { message: 'Not found' } };
            coreApi.deleteNamespacedService.mockRejectedValue(error);
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                services: ['my-service'],
            });
            expect(ui.logError).toHaveBeenCalledWith(expect.stringContaining('Failed to delete Service my-service'));
        });
        it('should handle errors without body gracefully', async () => {
            const error = new Error('Network error');
            coreApi.deleteNamespacedSecret.mockRejectedValue(error);
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                secrets: ['my-secret'],
            });
            expect(ui.logError).toHaveBeenCalledWith(expect.stringContaining('Network error'));
        });
        it('should delete resources in correct order: Deployments, Services, PVCs, ConfigMaps, Secrets', async () => {
            coreApi.deleteNamespacedService.mockResolvedValue({});
            coreApi.deleteNamespacedPersistentVolumeClaim.mockResolvedValue({});
            coreApi.deleteNamespacedConfigMap.mockResolvedValue({});
            coreApi.deleteNamespacedSecret.mockResolvedValue({});
            appsApi.deleteNamespacedDeployment.mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                services: ['svc1'],
                deployments: ['dep1'],
                configMaps: ['cm1'],
                secrets: ['secret1'],
                pvcs: ['pvc1'],
            });
            // Verify order through success log calls
            const successCalls = ui.logSuccess.mock.calls.map((call) => call[0]);
            expect(successCalls).toEqual([
                'Deployment dep1 deleted.',
                'Service svc1 deleted.',
                'PVC pvc1 deleted.',
                'ConfigMap cm1 deleted.',
                'Secret secret1 deleted.',
            ]);
        });
        it('should delete multiple resources of same type', async () => {
            coreApi.deleteNamespacedService.mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                services: ['svc1', 'svc2', 'svc3'],
            });
            expect(coreApi.deleteNamespacedService).toHaveBeenCalledTimes(3);
            expect(ui.logSuccess).toHaveBeenCalledTimes(3);
        });
        it('should continue deleting other resources if one fails', async () => {
            const error = new Error('Delete failed');
            coreApi.deleteNamespacedService
                .mockRejectedValueOnce(error)
                .mockResolvedValue({});
            await cleaner.cleanResources(namespace, {
                ...emptySelections,
                services: ['svc1', 'svc2'],
            });
            expect(coreApi.deleteNamespacedService).toHaveBeenCalledTimes(2);
            expect(ui.logError).toHaveBeenCalledTimes(1);
            expect(ui.logSuccess).toHaveBeenCalledTimes(1);
        });
    });
});
