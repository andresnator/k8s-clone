import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import os from 'os';

// Set up mock before importing ConfigLoader
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockMkdirSync = jest.fn();

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

// Import after mocking
const { 
    ConfigLoader, 
    resolveConfigPath, 
    ensureConfigDir, 
    initializeConfigFile,
    DEFAULT_CONFIG,
    CONFIG_ENV_VAR,
    DEFAULT_CONFIG_DIR,
    DEFAULT_CONFIG_PATH 
} = await import('../src/config.js');

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

        it('should handle invalid config file gracefully', () => {
            mockExistsSync.mockReturnValue(true);
            // Create invalid content that will fail both YAML and JSON parsing
            mockReadFileSync.mockReturnValue('{ invalid: : json: yaml: }');
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

    describe('getConfigPath', () => {
        it('should return the resolved config path', () => {
            mockExistsSync.mockReturnValue(false);

            const loader = new ConfigLoader('my-config.json');
            const configPath = loader.getConfigPath();

            expect(configPath).toContain('my-config.json');
        });
    });

    describe('getApps', () => {
        it('should return apps when config has apps', () => {
            const configWithApps = {
                ...mockConfig,
                apps: [
                    {
                        name: 'test-app',
                        context: 'cluster1',
                        namespaces: 'ns1',
                        services: [{ resource: 'svc1' }],
                        deployments: [{ resource: 'dep1' }]
                    }
                ]
            };
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithApps));

            const loader = new ConfigLoader('k8s-defaults.json');
            const apps = loader.getApps();

            expect(apps).not.toBeNull();
            expect(apps).toHaveLength(1);
            expect(apps![0].name).toBe('test-app');
        });

        it('should return null when config has no apps', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader('k8s-defaults.json');
            const apps = loader.getApps();

            expect(apps).toBeNull();
        });

        it('should return null when config has empty apps array', () => {
            const configWithEmptyApps = { ...mockConfig, apps: [] };
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithEmptyApps));

            const loader = new ConfigLoader('k8s-defaults.json');
            const apps = loader.getApps();

            expect(apps).toBeNull();
        });

        it('should return null when config is not loaded', () => {
            mockExistsSync.mockReturnValue(false);

            const loader = new ConfigLoader('k8s-defaults.json');
            const apps = loader.getApps();

            expect(apps).toBeNull();
        });

        it('should return multiple apps', () => {
            const configWithMultipleApps = {
                ...mockConfig,
                apps: [
                    { name: 'app1', context: 'cluster1', namespaces: 'ns1' },
                    { name: 'app2', context: 'cluster2', namespaces: 'ns2' }
                ]
            };
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithMultipleApps));

            const loader = new ConfigLoader('k8s-defaults.json');
            const apps = loader.getApps();

            expect(apps).not.toBeNull();
            expect(apps).toHaveLength(2);
        });
    });

    describe('getApp', () => {
        const configWithApps = {
            ...mockConfig,
            apps: [
                {
                    name: 'test-app',
                    context: 'cluster1',
                    namespaces: 'ns1',
                    services: [{ resource: 'svc1' }]
                },
                {
                    name: 'other-app',
                    context: 'cluster2',
                    namespaces: 'ns2',
                    deployments: [{ resource: 'dep1' }]
                }
            ]
        };

        it('should return specific app by name', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithApps));

            const loader = new ConfigLoader('k8s-defaults.json');
            const app = loader.getApp('test-app');

            expect(app).not.toBeNull();
            expect(app!.name).toBe('test-app');
            expect(app!.context).toBe('cluster1');
        });

        it('should return null when app not found', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithApps));

            const loader = new ConfigLoader('k8s-defaults.json');
            const app = loader.getApp('non-existent-app');

            expect(app).toBeNull();
        });

        it('should return null when no apps are configured', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const loader = new ConfigLoader('k8s-defaults.json');
            const app = loader.getApp('test-app');

            expect(app).toBeNull();
        });

        it('should return correct app when multiple apps exist', () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(configWithApps));

            const loader = new ConfigLoader('k8s-defaults.json');
            const app = loader.getApp('other-app');

            expect(app).not.toBeNull();
            expect(app!.name).toBe('other-app');
            expect(app!.context).toBe('cluster2');
        });
    });
});

describe('resolveConfigPath', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env[CONFIG_ENV_VAR];
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should use provided configPath when given', () => {
        const result = resolveConfigPath('custom-config.json');
        expect(result).toContain('custom-config.json');
    });

    it('should use environment variable when no configPath is provided', () => {
        process.env[CONFIG_ENV_VAR] = '/custom/path/to/config';
        const result = resolveConfigPath();
        expect(result).toBe('/custom/path/to/config');
    });

    it('should fall back to default path when neither configPath nor env var is set', () => {
        const result = resolveConfigPath();
        expect(result).toBe(DEFAULT_CONFIG_PATH);
    });

    it('should prioritize configPath over environment variable', () => {
        process.env[CONFIG_ENV_VAR] = '/env/path/config';
        const result = resolveConfigPath('explicit-config.json');
        expect(result).toContain('explicit-config.json');
        expect(result).not.toContain('/env/path');
    });
});

describe('ensureConfigDir', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create directory if it does not exist', () => {
        mockExistsSync.mockReturnValue(false);
        
        ensureConfigDir('/home/user/.k8s-clone/config.yaml');
        
        expect(mockMkdirSync).toHaveBeenCalledWith('/home/user/.k8s-clone', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
        mockExistsSync.mockReturnValue(true);
        
        ensureConfigDir('/home/user/.k8s-clone/config.yaml');
        
        expect(mockMkdirSync).not.toHaveBeenCalled();
    });
});

describe('initializeConfigFile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create config file with default structure if it does not exist', () => {
        mockExistsSync.mockImplementation((p: unknown) => {
            // File doesn't exist, but directory might
            if (path.basename(String(p)) === 'config.yaml') return false;
            return true;
        });

        const result = initializeConfigFile('/home/user/.k8s-clone/config.yaml');

        expect(result).toBe(true);
        expect(mockWriteFileSync).toHaveBeenCalled();
        const writeCall = mockWriteFileSync.mock.calls[0];
        expect(writeCall[0]).toBe('/home/user/.k8s-clone/config.yaml');
        expect(writeCall[2]).toBe('utf-8');
        // Check that it's YAML format (contains YAML-style content)
        expect(String(writeCall[1])).toContain('clusters: []');
    });

    it('should not create config file if it already exists', () => {
        mockExistsSync.mockReturnValue(true);

        const result = initializeConfigFile('/home/user/.k8s-clone/config.yaml');

        expect(result).toBe(false);
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', () => {
        mockExistsSync.mockReturnValue(false);

        initializeConfigFile('/home/user/.k8s-clone/config.yaml');

        expect(mockMkdirSync).toHaveBeenCalledWith('/home/user/.k8s-clone', { recursive: true });
    });
});

describe('DEFAULT_CONFIG', () => {
    it('should have the correct structure', () => {
        expect(DEFAULT_CONFIG).toEqual({
            clusters: [],
            namespaces: {},
            services: {},
            deployments: {},
            configMaps: {},
            secrets: {},
            persistentVolumeClaims: {},
            apps: []
        });
    });
});

describe('Constants', () => {
    it('should define CONFIG_ENV_VAR correctly', () => {
        expect(CONFIG_ENV_VAR).toBe('K8S_CLONE_CONFIG');
    });

    it('should define DEFAULT_CONFIG_DIR correctly', () => {
        expect(DEFAULT_CONFIG_DIR).toBe(path.join(os.homedir(), '.k8s-clone'));
    });

    it('should define DEFAULT_CONFIG_PATH correctly', () => {
        expect(DEFAULT_CONFIG_PATH).toBe(path.join(os.homedir(), '.k8s-clone', 'config.yaml'));
    });
});

describe('YAML Config Support', () => {
    const mockYamlConfig = `
clusters:
  - name: cluster1
  - name: cluster2
namespaces:
  cluster1:
    - name: ns1
    - name: ns2
  cluster2:
    - name: ns3
services:
  ns1:
    - name: svc1
    - name: svc2
`;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load YAML config successfully', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(mockYamlConfig);

        const loader = new ConfigLoader('k8s-defaults.yaml');
        const clusters = loader.getClusters();

        expect(clusters).toEqual(['cluster1', 'cluster2']);
    });

    it('should load JSON config for backwards compatibility', () => {
        const mockJsonConfig = {
            clusters: [{ name: 'json-cluster' }],
        };
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify(mockJsonConfig));

        const loader = new ConfigLoader('k8s-defaults.json');
        const clusters = loader.getClusters();

        expect(clusters).toEqual(['json-cluster']);
    });

    it('should handle YAML apps configuration', () => {
        const yamlWithApps = `
clusters:
  - name: test
apps:
  - name: test-app
    context: test
    namespaces: test-ns
    services:
      - resource: svc1
`;
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(yamlWithApps);

        const loader = new ConfigLoader('config.yaml');
        const apps = loader.getApps();

        expect(apps).not.toBeNull();
        expect(apps).toHaveLength(1);
        expect(apps![0].name).toBe('test-app');
    });
});
