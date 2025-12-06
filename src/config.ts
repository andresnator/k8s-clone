import fs from 'fs';
import path from 'path';
import os from 'os';
import { K8sClient } from './k8s.js';

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
 * Loads and provides access to cluster, namespace, and resource configurations.
 * Supports loading from a file (default: ~/.k8s-clone/config) or K8S_CLONE_CONFIG env var.
 * Auto-detects configuration if missing.
 */
export class ConfigLoader {
    private config: Config | null = null;
    private configPath: string;

    constructor() {
        this.configPath = this.resolveConfigPath();
    }

    private resolveConfigPath(): string {
        if (process.env.K8S_CLONE_CONFIG) {
            return process.env.K8S_CLONE_CONFIG;
        }
        return path.join(os.homedir(), '.k8s-clone', 'config');
    }

    async init() {
        if (fs.existsSync(this.configPath)) {
            try {
                const fileContent = fs.readFileSync(this.configPath, 'utf-8');
                this.config = JSON.parse(fileContent);
            } catch (error) {
                console.warn(`[WARN] Failed to parse ${this.configPath}. Recreating default config.`);
                await this.createDefaultConfig();
            }
        } else {
            await this.createDefaultConfig();
        }
    }

    private async createDefaultConfig() {
        console.log(`Creating default configuration at ${this.configPath}...`);

        try {
            const k8sClient = new K8sClient();
            const contexts = k8sClient.getContexts();
            const clusters: ClusterConfig[] = contexts.map(name => ({ name }));

            // Initialize empty config structure
            const newConfig: Config = {
                clusters,
                namespaces: {},
                services: {},
                deployments: {},
                configMaps: {},
                secrets: {},
                persistentVolumeClaims: {}
            };

            // Detect resources for the current context
            try {
                const currentContext = k8sClient.getCurrentContext();
                // We could iterate over all contexts, but that might be slow/fail if auth is missing.
                // For now, let's just populate the structure generally or maybe just for the current context?
                // The requirements say: "Retrieve resources from the current context"

                // Note: The structure requires resources to be keyed by namespace, but usually they are keyed by cluster-namespace?
                // Wait, looking at current Config interface:
                // namespaces: Record<string, NamespaceConfig[]>  -> looks like key is cluster name?
                // services: Record<string, ResourceConfig[]>     -> key is namespace name?

                // Let's check the k8s-defaults.json content again to be sure about the schema.
                // "namespaces": { "source": [{"name": "source"}], "dest": [{"name": "dest"}] } -> key is cluster name?
                // "services": { "source": [{"name": "backend"}] } -> key is namespace name?

                // Yes, "namespaces" seems keyed by Cluster Name.
                // "services", "deployments", etc seems keyed by Namespace Name (e.g. "source" in the example was a namespace name too).

                // Let's populate namespaces for the current context (assuming context name == cluster name for simplicity in this mapping, though they differ in kubeconfig)

                // Actually, config.ts comments said: 
                // "namespaces": { "cluster1": [{ "name": "ns1" }, ...], ... },
                // "services": { "namespace": [{ "name": "svc1" }, ...], ... },

                const namespaces = await k8sClient.listNamespaces();
                newConfig.namespaces = {
                    [currentContext]: namespaces.map(name => ({ name }))
                };

                // For each namespace, we could try to list resources, but that might be too heavy?
                // The requirements say: "Retrieve resources from the current context, including namespaces, services, deployments, etc."
                // "automatically select the clusters configured... retrieve resources..."

                // Let's try to populate for the 'default' namespace or all? 
                // Listing everything for all namespaces might take a long time. 
                // Let's prioritize the namespaces found.

                // Since this is "defaults", maybe we don't need to populate EVERYTHING.
                // But the requirement says "Retrieve resources...". 
                // Let's iterate over namespaces.

                for (const ns of namespaces) {
                    const [svcs, deps, cms, secrets, pvcs] = await Promise.all([
                        k8sClient.listServices(ns),
                        k8sClient.listDeployments(ns),
                        k8sClient.listConfigMaps(ns),
                        k8sClient.listSecrets(ns),
                        k8sClient.listPVCs(ns)
                    ]);

                    if (svcs.length) newConfig.services![ns] = svcs.map(r => ({ name: r.metadata?.name || '' })).filter(r => r.name);
                    if (deps.length) newConfig.deployments![ns] = deps.map(r => ({ name: r.metadata?.name || '' })).filter(r => r.name);
                    if (cms.length) newConfig.configMaps![ns] = cms.map(r => ({ name: r.metadata?.name || '' })).filter(r => r.name);
                    if (secrets.length) newConfig.secrets![ns] = secrets.map(r => ({ name: r.metadata?.name || '' })).filter(r => r.name);
                    if (pvcs.length) newConfig.persistentVolumeClaims![ns] = pvcs.map(r => ({ name: r.metadata?.name || '' })).filter(r => r.name);
                }

            } catch (err) {
                console.warn("Could not auto-detect resources:", err);
            }

            this.config = newConfig;

            // Ensure directory exists
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 4));
            console.log(`Configuration saved to ${this.configPath}`);

        } catch (error) {
            console.error("Failed to create default config:", error);
            // Fallback to empty
            this.config = {
                clusters: [],
                namespaces: {},
                services: {},
                deployments: {},
                configMaps: {},
                secrets: {},
                persistentVolumeClaims: {}
            };
        }
    }

    getClusters(): string[] | null {
        if (this.config?.clusters && this.config.clusters.length > 0) {
            return this.config.clusters.map(c => c.name);
        }
        return null; // Return null to fallback to API
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
