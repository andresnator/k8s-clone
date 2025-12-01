#!/usr/bin/env node
import { K8sClient } from './k8s.js';
import { UI, BackError } from './ui.js';
import { Migrator } from './migrator.js';
import { Cleaner } from './cleaner.js';
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

    // Main Loop
    while (true) {
        try {
            console.log(''); // Spacing
            const action = await ui.showMainMenu();

            if (action === 'exit') {
                console.log(chalk.yellow('Goodbye!'));
                process.exit(0);
            }

            if (action === 'clone') {
                await runCloneFlow(ui, contexts);
            } else if (action === 'clean') {
                await runCleanFlow(ui, contexts);
            }

        } catch (error: any) {
            if (error instanceof BackError) {
                // User requested back to main menu
                continue;
            }
            ui.logError(`An error occurred: ${error.message}`);
            // Don't exit, just loop back
        }
    }
}

async function runCloneFlow(ui: UI, contexts: string[]) {
    console.log(chalk.cyan('\n--- Clone Resources ---\n'));

    // 1. Source Selection
    const sourceCtx = await ui.selectContext(contexts, 'Select Source Context (Cluster):');
    const sourceClient = new K8sClient(sourceCtx);

    ui.logInfo(`Fetching namespaces from ${sourceCtx}...`);
    const namespaces = await sourceClient.listNamespaces();
    const sourceNs = await ui.selectNamespace(namespaces, 'Select Source Namespace:');

    // 2. Destination Selection
    const destCtx = await ui.selectContext(contexts, 'Select Destination Context (Cluster):');
    const destClient = new K8sClient(destCtx);

    ui.logInfo(`Fetching namespaces from ${destCtx}...`);
    const destNamespaces = await destClient.listNamespaces();
    const destNs = await ui.selectNamespace(destNamespaces, 'Select Destination Namespace:');

    if (sourceCtx === destCtx && sourceNs === destNs) {
        ui.logError('Source and Destination must be different (either different cluster or different namespace).');
        return; // Go back to menu
    }

    const migrator = new Migrator(sourceClient, destClient, ui);

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
        return;
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

async function runCleanFlow(ui: UI, contexts: string[]) {
    console.log(chalk.red('\n--- Clean Namespace (Delete Resources) ---\n'));

    const context = await ui.selectContext(contexts, 'Select Context (Cluster):');
    const client = new K8sClient(context);
    const cleaner = new Cleaner(client, ui);

    const namespaces = await client.listNamespaces();
    const namespace = await ui.selectNamespace(namespaces, 'Select Namespace to Clean:');

    ui.logInfo(`Fetching resources from ${namespace} in ${context}...`);

    const services = await client.listServices(namespace);
    const deployments = await client.listDeployments(namespace);
    const configMaps = await client.listConfigMaps(namespace);
    const secrets = await client.listSecrets(namespace);
    const pvcs = await client.listPVCs(namespace);

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

    console.log(chalk.red('\nDeletion Summary (These resources will be PERMANENTLY DELETED):'));
    summary.forEach(s => console.log(chalk.white(`- ${s}`)));
    console.log('');

    const confirmed = await ui.confirmAction(`Are you sure you want to DELETE these resources from ${namespace}?`);

    if (!confirmed) {
        console.log(chalk.yellow('Deletion cancelled.'));
        return;
    }

    await cleaner.cleanResources(namespace, {
        services: selectedServices,
        deployments: selectedDeployments,
        configMaps: selectedConfigMaps,
        secrets: selectedSecrets,
        pvcs: selectedPVCs,
    });

    ui.logSuccess('Cleanup process completed.');
}

main();
