import fs from 'fs';
import path from 'path';
import os from 'os';

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
 * Default empty configuration structure for k8s-clone.
 * This is created when the config file doesn't exist.
 */
export const DEFAULT_CONFIG: Config = {
    clusters: [],
    namespaces: {},
    services: {},
    deployments: {},
    configMaps: {},
    secrets: {},
    persistentVolumeClaims: {}
};

/**
 * Environment variable name for the k8s-clone config path.
 */
export const CONFIG_ENV_VAR = 'K8S_CLONE_CONFIG';

/**
 * Default config directory path (~/.k8s-clone).
 */
export const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.k8s-clone');

/**
 * Default config file path (~/.k8s-clone/config).
 */
export const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, 'config');

/**
 * Resolves the config file path using the following priority:
 * 1. If configPath parameter is provided (not undefined), use it
 * 2. Check K8S_CLONE_CONFIG environment variable
 * 3. Fall back to ~/.k8s-clone/config
 */
export function resolveConfigPath(configPath?: string): string {
    if (configPath !== undefined) {
        return path.resolve(process.cwd(), configPath);
    }
    
    const envPath = process.env[CONFIG_ENV_VAR];
    if (envPath) {
        return path.resolve(envPath);
    }
    
    return DEFAULT_CONFIG_PATH;
}

/**
 * Ensures the config directory exists, creating it if necessary.
 */
export function ensureConfigDir(configPath: string): void {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Creates a default config file with the empty structure if it doesn't exist.
 * Returns true if the file was created, false if it already existed.
 */
export function initializeConfigFile(configPath: string): boolean {
    if (fs.existsSync(configPath)) {
        return false;
    }
    
    ensureConfigDir(configPath);
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 4), 'utf-8');
    return true;
}

/**
 * Loads and provides access to cluster, namespace, and resource configurations from a JSON file.
 * If the config file doesn't exist or is invalid, methods return null to trigger fallback to API calls.
 *
 * The config file path is resolved in the following order:
 * 1. If a path is provided to the constructor, use it
 * 2. Check K8S_CLONE_CONFIG environment variable
 * 3. Fall back to ~/.k8s-clone/config
 *
 * The expected config file structure:
 * {
 *   "clusters": [{ "name": "cluster1" }, ...],
 *   "namespaces": { "cluster1": [{ "name": "ns1" }, ...], ... },
 *   "services": { "namespace": [{ "name": "svc1" }, ...], ... },
 *   "deployments": { "namespace": [{ "name": "dep1" }, ...], ... },
 *   "configMaps": { "namespace": [{ "name": "cm1" }, ...], ... },
 *   "secrets": { "namespace": [{ "name": "secret1" }, ...], ... },
 *   "persistentVolumeClaims": { "namespace": [{ "name": "pvc1" }, ...], ... }
 * }
 *
 * @example
 * const config = new ConfigLoader(); // Uses K8S_CLONE_CONFIG or ~/.k8s-clone/config
 * const clusters = config.getClusters() || await fetchFromAPI();
 */
export class ConfigLoader {
    private config: Config | null = null;
    private configPath: string;

    constructor(configPath?: string) {
        this.configPath = resolveConfigPath(configPath);
        this.loadConfig();
    }

    /**
     * Returns the resolved config file path.
     */
    getConfigPath(): string {
        return this.configPath;
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
