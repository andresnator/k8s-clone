import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import os from 'os';

// Mocks
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();

// Mock K8sClient
const mockK8sClient = {
    getContexts: jest.fn().mockReturnValue(['cluster1']),
    getCurrentContext: jest.fn().mockReturnValue('cluster1'),
    listNamespaces: jest.fn().mockResolvedValue(['default']),
    listServices: jest.fn().mockResolvedValue([]),
    listDeployments: jest.fn().mockResolvedValue([]),
    listConfigMaps: jest.fn().mockResolvedValue([]),
    listSecrets: jest.fn().mockResolvedValue([]),
    listPVCs: jest.fn().mockResolvedValue([]),
};

const MockK8sClientConstructor = jest.fn(() => mockK8sClient);

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
        mkdirSync: mockMkdirSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
}));

jest.unstable_mockModule('../src/k8s.js', () => ({
    K8sClient: MockK8sClientConstructor
}));

// Import after mocking
const { ConfigLoader } = await import('../src/config.js');

describe('ConfigLoader', () => {
    const mockConfig = {
        clusters: [{ name: 'cluster1' }, { name: 'cluster2' }],
        namespaces: {
            cluster1: [{ name: 'ns1' }, { name: 'ns2' }],
            cluster2: [{ name: 'ns3' }],
        },
        services: {
            ns1: [{ name: 'svc1' }, { name: 'svc2' }],
        },
        deployments: {
            ns1: [{ name: 'dep1' }],
        },
        configMaps: {
            ns1: [{ name: 'cm1' }],
        },
        secrets: {
            ns1: [{ name: 'secret1' }],
        },
        persistentVolumeClaims: {
            ns1: [{ name: 'pvc1' }],
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.K8S_CLONE_CONFIG = ''; // Clear env var
    });

    describe('init', () => {
        it('should load config from file when it exists', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader();
            await loader.init();

            expect(mockExistsSync).toHaveBeenCalled();
            expect(mockReadFileSync).toHaveBeenCalled();
            expect(loader.getClusters()).toEqual(['cluster1', 'cluster2']);
        });

        it('should create default config when file does not exist', async () => {
            mockExistsSync.mockReturnValue(false); // File not found

            const loader = new ConfigLoader();
            await loader.init();

            expect(MockK8sClientConstructor).toHaveBeenCalled();
            expect(mockK8sClient.getContexts).toHaveBeenCalled();
            expect(mockK8sClient.listNamespaces).toHaveBeenCalled();
            expect(mockWriteFileSync).toHaveBeenCalled();
        });

        it('should use K8S_CLONE_CONFIG env var if set', async () => {
            const customPath = '/custom/path/config.json';
            process.env.K8S_CLONE_CONFIG = customPath;
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader();
            await loader.init();

            expect(mockExistsSync).toHaveBeenCalledWith(customPath);
            expect(mockReadFileSync).toHaveBeenCalledWith(customPath, 'utf-8');
        });

        it('should handle invalid JSON by recreating config', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json');

            const loader = new ConfigLoader();
            await loader.init();

            // Should catch error and try to recreate
            expect(MockK8sClientConstructor).toHaveBeenCalled();
            expect(mockWriteFileSync).toHaveBeenCalled();
        });
    });

    describe('getClusters', () => {
        it('should return null when config uses default empty structure (if init failed or empty)', async () => {
            // Simulate empty config loading
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ clusters: [] }));

            const loader = new ConfigLoader();
            await loader.init();

            expect(loader.getClusters()).toBeNull(); // Because getClusters implementation returns null if empty array
        });
    });

    describe('getNamespaces', () => {
        it('should return namespace names for a given cluster', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader();
            await loader.init();

            const namespaces = loader.getNamespaces('cluster1');
            expect(namespaces).toEqual(['ns1', 'ns2']);
        });
    });

    describe('getResources', () => {
        it('should return service names for a given namespace', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader();
            await loader.init();

            const services = loader.getResources('services', 'ns1');
            expect(services).toEqual(['svc1', 'svc2']);
        });
    });
});
