import inquirer from 'inquirer';
import chalk from 'chalk';
import figlet from 'figlet';

export class UI {
    showBanner() {
        console.log(
            chalk.cyan(
                figlet.textSync('K8s Migrator', { horizontalLayout: 'full' })
            )
        );
        console.log(chalk.yellow('Kubernetes Resource Migration Tool\n'));
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
