#!/usr/bin/env node
import { K8sClient } from './k8s.js';
import { UI } from './ui.js';
import { Migrator } from './migrator.js';
import chalk from 'chalk';

async function main() {
    const ui = new UI();
    await ui.showBanner();

    const k8sClient = new K8sClient();
    const migrator = new Migrator(k8sClient, ui);

    try {
        const namespaces = await k8sClient.listNamespaces();
        console.log('Available Namespaces:', namespaces);

        const sourceNs = await ui.selectNamespace(namespaces, 'Enter Source Namespace:');
        const destNs = await ui.selectNamespace(namespaces, 'Enter Destination Namespace:');

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

        console.log(chalk.yellow('\nMigration Summary:'));
        summary.forEach(s => console.log(chalk.white(`- ${s}`)));
        console.log('');

        const confirmed = await ui.confirmAction(`Are you sure you want to migrate these resources from ${sourceNs} to ${destNs}?`);

        if (!confirmed) {
            console.log(chalk.yellow('Migration cancelled.'));
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

    } catch (error: any) {
        ui.logError(`An error occurred: ${error.message}`);
        process.exit(1);
    }
}

main();
