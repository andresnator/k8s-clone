import inquirer from 'inquirer';
import chalk from 'chalk';
import React from 'react';
import { render } from 'ink';
import { Banner } from './Banner.js';

export class BackError extends Error {
    constructor() {
        super('Back to main menu');
        this.name = 'BackError';
    }
}

export class UI {
    async showBanner(version?: string) {
        const { unmount } = render(React.createElement(Banner, { version }));
        await new Promise(resolve => setTimeout(resolve, 100));
        unmount();
        console.log(''); // Ensure spacing after banner
    }

    async showMainMenu(): Promise<'clone' | 'clean' | 'exit'> {
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: 'Clone Resources (Cluster to Cluster)', value: 'clone' },
                    { name: 'Clean Namespace (Delete Resources)', value: 'clean' },
                    { name: 'Exit', value: 'exit' },
                ],
            },
        ]);
        return action;
    }

    async selectContext(contexts: string[], message: string): Promise<string> {
        const choices = [...contexts, new inquirer.Separator(), { name: chalk.yellow('[ Back to Main Menu ]'), value: 'BACK' }];
        const { context } = await inquirer.prompt([
            {
                type: 'list',
                name: 'context',
                message: message,
                choices: choices,
            },
        ]);

        if (context === 'BACK') {
            throw new BackError();
        }
        return context;
    }

    async selectNamespace(namespaces: string[], message: string): Promise<string> {
        const choices = [
            ...namespaces,
            new inquirer.Separator(),
            { name: chalk.yellow('[ Back to Main Menu ]'), value: 'BACK' }
        ];

        const { namespace } = await inquirer.prompt([
            {
                type: 'list',
                name: 'namespace',
                message: message,
                choices: choices,
                pageSize: 20,
            },
        ]);

        if (namespace === 'BACK') {
            throw new BackError();
        }
        return namespace;
    }

    async selectResources(resourceType: string, resources: string[]): Promise<string[]> {
        if (resources.length === 0) {
            console.log(chalk.yellow(`No ${resourceType} found.`));
            return [];
        }

        // No "Back" option in the checkbox list to prevent 'toggle all' from selecting it
        const choices = [...resources];

        const { selected } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selected',
                message: `Select ${resourceType}:`,
                choices: choices,
                pageSize: 20,
            },
        ]);

        if (selected.length === 0) {
            // If nothing selected, ask user intent
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: `No ${resourceType} selected. What would you like to do?`,
                    choices: [
                        { name: 'Skip (Migrate None)', value: 'SKIP' },
                        { name: 'Retry Selection', value: 'RETRY' },
                        { name: chalk.yellow('[ Back to Main Menu ]'), value: 'BACK' },
                    ],
                },
            ]);

            if (action === 'BACK') {
                throw new BackError();
            }
            if (action === 'RETRY') {
                return this.selectResources(resourceType, resources);
            }
            // action === 'SKIP'
            return [];
        }

        return selected;
    }

    async confirmAction(message: string): Promise<boolean> {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: message,
                default: false,
            },
        ]);
        return confirm;
    }

    logInfo(message: string) {
        console.log(chalk.blue(`[INFO] ${message}`));
    }

    logSuccess(message: string) {
        console.log(chalk.green(`[SUCCESS] ${message}`));
    }

    logError(message: string) {
        console.log(chalk.red(`[ERROR] ${message}`));
    }
}
