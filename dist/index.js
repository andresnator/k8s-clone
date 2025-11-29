#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const k8s_1 = require("./k8s");
const ui_1 = require("./ui");
const migrator_1 = require("./migrator");
const chalk_1 = __importDefault(require("chalk"));
async function main() {
    const ui = new ui_1.UI();
    ui.showBanner();
    const k8sClient = new k8s_1.K8sClient();
    const migrator = new migrator_1.Migrator(k8sClient, ui);
    try {
        const namespaces = await k8sClient.listNamespaces();
        const sourceNs = await ui.selectNamespace(namespaces, 'Select Source Namespace:');
        const destNs = await ui.selectNamespace(namespaces, 'Select Destination Namespace:');
        if (sourceNs === destNs) {
            ui.logError('Source and Destination namespaces must be different.');
            process.exit(1);
        }
        ui.logInfo(`Fetching resources from ${sourceNs}...`);
        const services = await k8sClient.listServices(sourceNs);
        const deployments = await k8sClient.listDeployments(sourceNs);
        const configMaps = await k8sClient.listConfigMaps(sourceNs);
        const secrets = await k8sClient.listSecrets(sourceNs);
        const pvcs = await k8sClient.listPVCs(sourceNs);
        const selectedServices = await ui.selectResources('Services', services.map(s => s.metadata?.name || ''));
        const selectedDeployments = await ui.selectResources('Deployments', deployments.map(d => d.metadata?.name || ''));
        const selectedConfigMaps = await ui.selectResources('ConfigMaps', configMaps.map(c => c.metadata?.name || ''));
        const selectedSecrets = await ui.selectResources('Secrets', secrets.map(s => s.metadata?.name || ''));
        const selectedPVCs = await ui.selectResources('PVCs', pvcs.map(p => p.metadata?.name || ''));
        const summary = [
            `Services: ${selectedServices.length}`,
            `Deployments: ${selectedDeployments.length}`,
            `ConfigMaps: ${selectedConfigMaps.length}`,
            `Secrets: ${selectedSecrets.length}`,
            `PVCs: ${selectedPVCs.length}`,
        ];
        console.log(chalk_1.default.yellow('\nMigration Summary:'));
        summary.forEach(s => console.log(chalk_1.default.white(`- ${s}`)));
        console.log('');
        const confirmed = await ui.confirmAction(`Are you sure you want to migrate these resources from ${sourceNs} to ${destNs}?`);
        if (!confirmed) {
            console.log(chalk_1.default.yellow('Migration cancelled.'));
            process.exit(0);
        }
        await migrator.migrateResources(sourceNs, destNs, {
            services: selectedServices,
            deployments: selectedDeployments,
            configMaps: selectedConfigMaps,
            secrets: selectedSecrets,
            pvcs: selectedPVCs,
        });
        ui.logSuccess('Migration process completed.');
    }
    catch (error) {
        ui.logError(`An error occurred: ${error.message}`);
        process.exit(1);
    }
}
main();
