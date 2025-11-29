import * as k8s from '@kubernetes/client-node';

export class K8sClient {
    private kc: k8s.KubeConfig;
    private k8sApi: k8s.CoreV1Api;
    private k8sAppsApi: k8s.AppsV1Api;

    constructor() {
        this.kc = new k8s.KubeConfig();
        this.kc.loadFromDefault();
        this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    }

    async listNamespaces(): Promise<string[]> {
        const res = await this.k8sApi.listNamespace();
        return res.items.map(ns => ns.metadata?.name || '').filter(n => n);
    }

    async listServices(namespace: string) {
        const res = await this.k8sApi.listNamespacedService({ namespace });
        return res.items;
    }

    async listDeployments(namespace: string) {
        const res = await this.k8sAppsApi.listNamespacedDeployment({ namespace });
        return res.items;
    }

    async listConfigMaps(namespace: string) {
        const res = await this.k8sApi.listNamespacedConfigMap({ namespace });
        return res.items;
    }

    async listSecrets(namespace: string) {
        const res = await this.k8sApi.listNamespacedSecret({ namespace });
        return res.items;
    }

    async listPVCs(namespace: string) {
        const res = await this.k8sApi.listNamespacedPersistentVolumeClaim({ namespace });
        return res.items;
    }

    getCoreApi() {
        return this.k8sApi;
    }

    getAppsApi() {
        return this.k8sAppsApi;
    }

    getKubeConfig() {
        return this.kc;
    }
}
