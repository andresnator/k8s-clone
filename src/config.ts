import fs from 'fs';
import path from 'path';

interface ClusterConfig {
    name: string;
}

interface NamespaceConfig {
    name: string;
}

interface ResourceConfig {
    name: string;
}

interface Config {
    clusters?: ClusterConfig[];
    namespaces?: Record<string, NamespaceConfig[]>;
    services?: Record<string, ResourceConfig[]>;
    deployments?: Record<string, ResourceConfig[]>;
    configMaps?: Record<string, ResourceConfig[]>;
    secrets?: Record<string, ResourceConfig[]>;
    persistentVolumeClaims?: Record<string, ResourceConfig[]>;
}

/**
 * LoadsLoads and providesprovides access to cluster, namespacenamespace, and resourceresource configurations from a JSON filefile.
 * If the config filefile doesn't exist or is invalid, methods return null to trigger fallback to API calls.
 *
 * The expected config filefile structurestructure:
 * {
 *   "clusters": [{ "namename": "cluster1" }, ...],
 *   "namespaces": { "cluster1": [{ "namename": "ns1" }, ...], ... },
 *   "services": { "namespacenamespace": [{ "namename": "svc1" }, ...], ... },
 *   "deployments": { "namespacenamespace": [{ "namename": "dep1" }, ...], ... },
 *   "configMaps": { "namespacenamespace": [{ "namename": "cm1" }, ...], ... },
 *   "secrets": { "namespacenamespace": [{ "namename": "secret1" }, ...], ... },
 *   "persistentVolumeVolumeClaims": { "namespacenamespace": [{ "namename": "pvc1" }, ...], ... }
 * }
 *
 * @exampleexample
 * const config = newnew ConfigLoaderLoader('k8s-defaultss-defaults.json');
 * const clusters = config.getClusters() || await fetchFromAPI();
 */
export class ConfigLoader {
    private config: Config | null = null;
    private configPath: string;

    constructor(configPath: string = 'k8s-defaults.json') {
        this.configPath = path.resolve(process.cwd(), configPath);
        this.loadConfig();
    }

    private loadConfig() {
        if (fs.existsSync(this.configPath)) {
            try {
                const fileContent = fs.readFileSync(this.configPath, 'utf-8');
                this.config = JSON.parse(fileContent);
            } catch (error) {
                console.warn(`[WARN] Failed to parse ${this.configPath}. Using default behavior.`);
            }
        }
    }

    getClusters(): string[] | null {
        if (this.config?.clusters && this.config.clusters.length > 0) {
            return this.config.clusters.map(c => c.name);
        }
        return null;
    }

    getNamespaces(clusterName: string): string[] | null {
        if (this.config?.namespaces && this.config.namespaces[clusterName]) {
            return this.config.namespaces[clusterName].map(ns => ns.name);
        }
        return null;
    }

    getResources(type: 'services' | 'deployments' | 'configMaps' | 'secrets' | 'persistentVolumeClaims', namespace: string): string[] | null {
        if (this.config && this.config[type] && this.config[type]![namespace]) {
            return this.config[type]![namespace].map(r => r.name);
        }
        return null;
    }
}
