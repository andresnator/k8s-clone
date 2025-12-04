import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Set up mock before importing ConfigLoader
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
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
    });

    describe('constructor', () => {
        it('should load config from file when it exists', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader('k8s-defaults.json');

            expect(mockExistsSync).toHaveBeenCalled();
            expect(mockReadFileSync).toHaveBeenCalled();
        });

        it('should handle missing config file gracefully', () => {
            mockExistsSync.mockReturnValue(false);

            const loader = new ConfigLoader('k8s-defaults.json');

            expect(mockReadFileSync).not.toHaveBeenCalled();
        });

        it('should handle invalid JSON in config file gracefully', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json');
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const loader = new ConfigLoader('k8s-defaults.json');

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('getClusters', () => {
        it('should return cluster names when config has clusters', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader('k8s-defaults.json');
            const clusters = loader.getClusters();

            expect(clusters).toEqual(['cluster1', 'cluster2']);
        });

        it('should return null when config has no clusters', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({}));

            const loader = new ConfigLoader('k8s-defaults.json');
            const clusters = loader.getClusters();

            expect(clusters).toBeNull();
        });

        it('should return null when config has empty clusters array', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ clusters: [] }));

            const loader = new ConfigLoader('k8s-defaults.json');
            const clusters = loader.getClusters();

            expect(clusters).toBeNull();
        });

        it('should return null when config is not loaded', () => {
            mockExistsSync.mockReturnValue(false);

            const loader = new ConfigLoader('k8s-defaults.json');
            const clusters = loader.getClusters();

            expect(clusters).toBeNull();
        });
    });

    describe('getNamespaces', () => {
        it('should return namespace names for a given cluster', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader('k8s-defaults.json');
            const namespaces = loader.getNamespaces('cluster1');

            expect(namespaces).toEqual(['ns1', 'ns2']);
        });

        it('should return null for unknown cluster', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader('k8s-defaults.json');
            const namespaces = loader.getNamespaces('unknown-cluster');

            expect(namespaces).toBeNull();
        });

        it('should return null when config has no namespaces', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify({ clusters: [{ name: 'cluster1' }] }));

            const loader = new ConfigLoader('k8s-defaults.json');
            const namespaces = loader.getNamespaces('cluster1');

            expect(namespaces).toBeNull();
        });
    });

    describe('getResources', () => {
        beforeEach(() => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));
        });

        it('should return service names for a given namespace', () => {
            const loader = new ConfigLoader('k8s-defaults.json');
            const services = loader.getResources('services', 'ns1');

            expect(services).toEqual(['svc1', 'svc2']);
        });

        it('should return deployment names for a given namespace', () => {
            const loader = new ConfigLoader('k8s-defaults.json');
            const deployments = loader.getResources('deployments', 'ns1');

            expect(deployments).toEqual(['dep1']);
        });

        it('should return configMap names for a given namespace', () => {
            const loader = new ConfigLoader('k8s-defaults.json');
            const configMaps = loader.getResources('configMaps', 'ns1');

            expect(configMaps).toEqual(['cm1']);
        });

        it('should return secret names for a given namespace', () => {
            const loader = new ConfigLoader('k8s-defaults.json');
            const secrets = loader.getResources('secrets', 'ns1');

            expect(secrets).toEqual(['secret1']);
        });

        it('should return PVC names for a given namespace', () => {
            const loader = new ConfigLoader('k8s-defaults.json');
            const pvcs = loader.getResources('persistentVolumeClaims', 'ns1');

            expect(pvcs).toEqual(['pvc1']);
        });

        it('should return null for unknown namespace', () => {
            const loader = new ConfigLoader('k8s-defaults.json');
            const services = loader.getResources('services', 'unknown-ns');

            expect(services).toBeNull();
        });

        it('should return null when resource type is not configured', () => {
            mockReadFileSync.mockReturnValue(JSON.stringify({ clusters: [] }));

            const loader = new ConfigLoader('k8s-defaults.json');
            const services = loader.getResources('services', 'ns1');

            expect(services).toBeNull();
        });
    });
});
