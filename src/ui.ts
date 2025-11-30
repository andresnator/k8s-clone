import inquirer from 'inquirer';
import chalk from 'chalk';
import React from 'react';
import { render } from 'ink';
import { Banner } from './Banner.js';

export class UI {
    async showBanner() {
        const { unmount } = render(React.createElement(Banner));
        // Give it a moment to render, then unmount so we can proceed with inquirer
        // Or better, just let it render and unmount immediately?
        // Ink renders to stdout. If we unmount, it might stop managing it.
        // But we want the text to stay.
        // If we unmount, Ink usually clears the output?
        // No, Ink appends to output. If we unmount, it stops updating.
        // But if we want it to persist, we should just let it be.
        // However, inquirer also writes to stdout.
        // Let's try waiting a small delay then unmount.
        await new Promise(resolve => setTimeout(resolve, 100));
        unmount();
    }

    async selectNamespace(namespaces: string[], message: string): Promise<string> {
        const { namespace } = await inquirer.prompt([
            {
                type: 'input',
                name: 'namespace',
                message: message,
                validate: (input) => {
                    if (namespaces.includes(input)) return true;
                    return `Namespace '${input}' not found. Available: ${namespaces.join(', ')}`;
                },
            },
        ]);
        return namespace;
    }

    async selectResources(resourceType: string, resources: string[]): Promise<string[]> {
        if (resources.length === 0) {
            console.log(chalk.yellow(`No ${resourceType} found.`));
            return [];
        }
        const { selected } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selected',
                message: `Select ${resourceType} to clone:`,
                choices: resources,
            },
        ]);
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
