"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.K8sClient = void 0;
const k8s = __importStar(require("@kubernetes/client-node"));
class K8sClient {
    constructor() {
        this.kc = new k8s.KubeConfig();
        this.kc.loadFromDefault();
        this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    }
    async listNamespaces() {
        const res = await this.k8sApi.listNamespace();
        return res.items.map(ns => ns.metadata?.name || '').filter(n => n);
    }
    async listServices(namespace) {
        const res = await this.k8sApi.listNamespacedService({ namespace });
        return res.items;
    }
    async listDeployments(namespace) {
        const res = await this.k8sAppsApi.listNamespacedDeployment({ namespace });
        return res.items;
    }
    async listConfigMaps(namespace) {
        const res = await this.k8sApi.listNamespacedConfigMap({ namespace });
        return res.items;
    }
    async listSecrets(namespace) {
        const res = await this.k8sApi.listNamespacedSecret({ namespace });
        return res.items;
    }
    async listPVCs(namespace) {
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
exports.K8sClient = K8sClient;
