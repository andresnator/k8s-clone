#!/usr/bin/env node
import { Command } from 'commander';
import { K8sClient } from './k8s.js';
import { UI, BackError } from './ui.js';
import { Migrator } from './migrator.js';
import { Cleaner } from './cleaner.js';
import { ConfigLoader } from './config.js';
import { checkForUpdate, formatUpdateMessage, getCurrentVersion } from './version-checker.js';
import chalk from 'chalk';
import { AppConfig, AppResource } from './types.js';

const config = new ConfigLoader();
const PACKAGE_NAME = '@andresnator/k8s-clone';
const VERSION_CHECK_TIMEOUT_MS = 3500;

async function main() {
    const ui = new UI();
    const currentVersion = getCurrentVersion();
    await ui.showBanner(currentVersion);

    // Check for updates with a timeout to avoid blocking too long
    const versionCheckPromise = checkForUpdate(PACKAGE_NAME);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), VERSION_CHECK_TIMEOUT_MS));
    
    // Wait for version check to complete (with timeout) before starting UI interaction
    const result = await Promise.race([versionCheckPromise, timeoutPromise]);
    if (result && result.hasUpdate) {
        const message = formatUpdateMessage(result, PACKAGE_NAME);
        console.log(chalk.yellow(message));
    }

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
            const apps = config.getApps();
            const hasApps = apps !== null && apps.length > 0;
            const action = await ui.showMainMenu(hasApps);

            if (action === 'exit') {
                console.log(chalk.yellow('Goodbye!'));
                process.exit(0);
            }

            if (action === 'clone') {
                await runCloneFlow(ui, contexts);
            } else if (action === 'clean') {
                await runCleanFlow(ui, contexts);
            } else if (action === 'apps') {
                await runAppsFlow(ui, contexts);
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

async function getResources(
    namespace: string,
    type: 'services' | 'deployments' | 'configMaps' | 'secrets' | 'persistentVolumeClaims',
    apiCall: () => Promise<any[]>
): Promise<string[]> {
    const fromConfig = config.getResources(type, namespace);
    if (fromConfig) return fromConfig;
    const fromApi = await apiCall();
    return fromApi.map(r => r.metadata?.name || '');
}

async function runCloneFlow(ui: UI, contexts: string[]) {
    console.log(chalk.cyan('\n--- Clone Resources ---\n'));

    // 1. Source Selection
    const configClusters = config.getClusters();
    const sourceCtx = await ui.selectContext(configClusters || contexts, 'Select Source Context (Cluster):');
    const sourceClient = new K8sClient(sourceCtx);

    ui.logInfo(`Fetching namespaces from ${sourceCtx}...`);
    const configSourceNamespaces = config.getNamespaces(sourceCtx);
    const namespaces = configSourceNamespaces || await sourceClient.listNamespaces();
    const sourceNs = await ui.selectNamespace(namespaces, 'Select Source Namespace:');

    // 2. Resource Selection
    ui.logInfo(`Fetching resources from ${sourceNs} in ${sourceCtx}...`);

    const services = await getResources(sourceNs, 'services', () => sourceClient.listServices(sourceNs));
    const deployments = await getResources(sourceNs, 'deployments', () => sourceClient.listDeployments(sourceNs));
    const configMaps = await getResources(sourceNs, 'configMaps', () => sourceClient.listConfigMaps(sourceNs));
    const secrets = await getResources(sourceNs, 'secrets', () => sourceClient.listSecrets(sourceNs));
    const pvcs = await getResources(sourceNs, 'persistentVolumeClaims', () => sourceClient.listPVCs(sourceNs));

    const selectedServices = await ui.selectResources('Services', services);
    const selectedDeployments = await ui.selectResources('Deployments', deployments);
    const selectedConfigMaps = await ui.selectResources('ConfigMaps', configMaps);
    const selectedSecrets = await ui.selectResources('Secrets', secrets);
    const selectedPVCs = await ui.selectResources('PVCs', pvcs);

    // 3. Destination Selection
    const destCtx = await ui.selectContext(configClusters || contexts, 'Select Destination Context (Cluster):');
    const destClient = new K8sClient(destCtx);

    ui.logInfo(`Fetching namespaces from ${destCtx}...`);
    const configDestNamespaces = config.getNamespaces(destCtx);
    const destNamespaces = configDestNamespaces || await destClient.listNamespaces();
    const destNs = await ui.selectNamespace(destNamespaces, 'Select Destination Namespace:');

    if (sourceCtx === destCtx && sourceNs === destNs) {
        ui.logError('Source and Destination must be different (either different cluster or different namespace).');
        return; // Go back to menu
    }

    const migrator = new Migrator(sourceClient, destClient, ui);

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

    const configClusters = config.getClusters();
    const context = await ui.selectContext(configClusters || contexts, 'Select Context (Cluster):');
    const client = new K8sClient(context);
    const cleaner = new Cleaner(client, ui);

    const configNamespaces = config.getNamespaces(context);
    const namespaces = configNamespaces || await client.listNamespaces();
    const namespace = await ui.selectNamespace(namespaces, 'Select Namespace to Clean:');

    ui.logInfo(`Fetching resources from ${namespace} in ${context}...`);

    const services = await getResources(namespace, 'services', () => client.listServices(namespace));
    const deployments = await getResources(namespace, 'deployments', () => client.listDeployments(namespace));
    const configMaps = await getResources(namespace, 'configMaps', () => client.listConfigMaps(namespace));
    const secrets = await getResources(namespace, 'secrets', () => client.listSecrets(namespace));
    const pvcs = await getResources(namespace, 'persistentVolumeClaims', () => client.listPVCs(namespace));

    const selectedServices = await ui.selectResources('Services', services);
    const selectedDeployments = await ui.selectResources('Deployments', deployments);
    const selectedConfigMaps = await ui.selectResources('ConfigMaps', configMaps);
    const selectedSecrets = await ui.selectResources('Secrets', secrets);
    const selectedPVCs = await ui.selectResources('PVCs', pvcs);

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

async function runAppsFlow(ui: UI, contexts: string[]) {
    console.log(chalk.cyan('\n--- Deploy App ---\n'));

    const apps = config.getApps();
    if (!apps || apps.length === 0) {
        ui.logError('No apps configured in config file.');
        return;
    }

    const appNames = apps.map(app => app.name);
    const selectedAppName = await ui.selectApp(appNames);
    
    const app = config.getApp(selectedAppName);
    if (!app) {
        ui.logError(`App '${selectedAppName}' not found.`);
        return;
    }

    ui.logInfo(`App: ${app.name}`);
    ui.logInfo(`Source Context: ${app.context}`);
    ui.logInfo(`Source Namespace: ${app.namespaces}`);

    // Setup clients
    const sourceClient = new K8sClient(app.context);
    
    // Select destination
    const configClusters = config.getClusters();
    const destCtx = await ui.selectContext(configClusters || contexts, 'Select Destination Context (Cluster):');
    const destClient = new K8sClient(destCtx);

    ui.logInfo(`Fetching namespaces from ${destCtx}...`);
    const configDestNamespaces = config.getNamespaces(destCtx);
    const destNamespaces = configDestNamespaces || await destClient.listNamespaces();
    const destNs = await ui.selectNamespace(destNamespaces, 'Select Destination Namespace:');

    if (app.context === destCtx && app.namespaces === destNs) {
        ui.logError('Source and Destination must be different (either different cluster or different namespace).');
        return;
    }

    // Extract resource names and overwrite-specs
    const extractResources = (resources?: AppResource[]): { names: string[], overwrites: Map<string, Record<string, any>> } => {
        const names: string[] = [];
        const overwrites = new Map<string, Record<string, any>>();
        const seenNames = new Set<string>();
        
        if (resources) {
            for (const res of resources) {
                if (seenNames.has(res.resource)) {
                    ui.logWarning(`Duplicate resource '${res.resource}' found in app. Only the last overwrite-spec will be used.`);
                }
                seenNames.add(res.resource);
                names.push(res.resource);
                if (res['overwrite-spec']) {
                    overwrites.set(res.resource, res['overwrite-spec']);
                }
            }
        }
        return { names, overwrites };
    };

    const mergeOverwrites = (...overwriteMaps: Map<string, Record<string, any>>[]): Map<string, Record<string, any>> => {
        const merged = new Map<string, Record<string, any>>();
        for (const overwriteMap of overwriteMaps) {
            for (const [name, spec] of overwriteMap) {
                merged.set(name, spec);
            }
        }
        return merged;
    };

    const services = extractResources(app.services);
    const deployments = extractResources(app.deployments);
    const configMaps = extractResources(app.configMaps);
    const secrets = extractResources(app.secrets);
    const pvcs = extractResources(app.persistentVolumeClaims);

    // Merge all overwrite-specs into one map
    const allOverwrites = mergeOverwrites(
        services.overwrites,
        deployments.overwrites,
        configMaps.overwrites,
        secrets.overwrites,
        pvcs.overwrites
    );

    const migrator = new Migrator(sourceClient, destClient, ui);

    const summary = [
        `Services: ${services.names.length}`,
        `Deployments: ${deployments.names.length}`,
        `ConfigMaps: ${configMaps.names.length}`,
        `Secrets: ${secrets.names.length}`,
        `PVCs: ${pvcs.names.length}`,
    ];

    console.log(chalk.yellow('\nApp Deployment Summary:'));
    summary.forEach(s => console.log(chalk.white(`- ${s}`)));
    
    if (allOverwrites.size > 0) {
        console.log(chalk.cyan(`\nResources with overwrite-spec: ${allOverwrites.size}`));
    }
    console.log('');

    const confirmed = await ui.confirmAction(`Deploy app '${app.name}' from ${app.namespaces} to ${destNs}?`);

    if (!confirmed) {
        console.log(chalk.yellow('Deployment cancelled.'));
        return;
    }

    await migrator.migrateResources(
        app.namespaces,
        destNs,
        {
            services: services.names,
            deployments: deployments.names,
            configMaps: configMaps.names,
            secrets: secrets.names,
            pvcs: pvcs.names,
        },
        allOverwrites
    );

    ui.logSuccess('App deployment completed.');
}

// Parse command-line arguments
const program = new Command();
const currentVersion = getCurrentVersion();

program
    .name('k8s-clone')
    .description('A CLI tool to clone and migrate Kubernetes resources across namespaces')
    .version(currentVersion, '-v, --version', 'Display version number')
    .helpOption('-h, --help', 'Display help for command')
    .allowUnknownOption(false); // Explicitly reject unknown options

program.parse(process.argv);

// If no options were provided, run the interactive main function
// Commander will have already handled --version, --help, and unknown options by this point
if (!process.argv.slice(2).length) {
    main();
}
