import React from 'react';
import { render, Box } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import inquirer from 'inquirer';
import chalk from 'chalk';

export class UI {
    showBanner() {
        // We use a temporary Ink render for the banner
        const Banner = () => (
            <Box flexDirection= "column" padding = { 1} >
                <Gradient name="morning" >
                    <BigText text="K8s Migrator" />
                        </Gradient>
                        </Box>
        );
        const { unmount } = render(<Banner />);
        // Unmount immediately after rendering to let inquirer take over
        setTimeout(() => unmount(), 100);
        // Note: Ink renders asynchronously, so we might need a small delay or just let it print.
        // However, mixing Ink and Inquirer in the same process is tricky.
        // A better approach for the banner is just to use the component and exit.
    }

    async selectNamespace(namespaces: string[], message: string): Promise<string> {
        const { namespace } = await inquirer.prompt([
            {
                type: 'list',
                name: 'namespace',
                message: message,
                choices: namespaces,
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
