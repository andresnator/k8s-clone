#!/usr/bin/env node
import { K8sClient } from './k8s.js';
import { UI } from './ui.js';
import { Migrator } from './migrator.js';
import chalk from 'chalk';

async function main() {
    const ui = new UI();
    await ui.showBanner();

    const tempClient = new K8sClient();
    const contexts = tempClient.getContexts();

    if (contexts.length === 0) {
        ui.logError('No contexts found in kubeconfig.');
        process.exit(1);
    }

    console.log('Available Contexts:', contexts);

    const sourceCtx = await ui.selectContext(contexts, 'Select Source Context (Cluster):');
    const destCtx = await ui.selectContext(contexts, 'Select Destination Context (Cluster):');

    const sourceClient = new K8sClient(sourceCtx);
    const destClient = new K8sClient(destCtx);

    const migrator = new Migrator(sourceClient, destClient, ui);

    try {
        const namespaces = await sourceClient.listNamespaces();
        console.log('Available Namespaces (Source):', namespaces);

        const sourceNs = await ui.selectNamespace(namespaces, 'Enter Source Namespace:');

        // For destination, we might want to list namespaces from dest cluster to validate, 
        // or just allow creating a new one (though our code assumes it exists or we create resources in it).
        // Let's list dest namespaces for validation/selection.
        const destNamespaces = await destClient.listNamespaces();
        console.log('Available Namespaces (Destination):', destNamespaces);
        const destNs = await ui.selectNamespace(destNamespaces, 'Enter Destination Namespace:');

        if (sourceCtx === destCtx && sourceNs === destNs) {
            ui.logError('Source and Destination must be different (either different cluster or different namespace).');
            process.exit(1);
        }

        ui.logInfo(`Fetching resources from ${sourceNs} in ${sourceCtx}...`);

        const services = await sourceClient.listServices(sourceNs);
        const deployments = await sourceClient.listDeployments(sourceNs);
        const configMaps = await sourceClient.listConfigMaps(sourceNs);
        const secrets = await sourceClient.listSecrets(sourceNs);
        const pvcs = await sourceClient.listPVCs(sourceNs);

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
