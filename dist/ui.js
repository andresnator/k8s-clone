"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
class UI {
    showBanner() {
        console.log(chalk_1.default.cyan(figlet_1.default.textSync('K8s Migrator', { horizontalLayout: 'full' })));
        console.log(chalk_1.default.yellow('Kubernetes Resource Migration Tool\n'));
    }
    async selectNamespace(namespaces, message) {
        const { namespace } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'namespace',
                message: message,
                choices: namespaces,
            },
        ]);
        return namespace;
    }
    async selectResources(resourceType, resources) {
        if (resources.length === 0) {
            console.log(chalk_1.default.yellow(`No ${resourceType} found.`));
            return [];
        }
        const { selected } = await inquirer_1.default.prompt([
            {
                type: 'checkbox',
                name: 'selected',
                message: `Select ${resourceType} to clone:`,
                choices: resources,
            },
        ]);
        return selected;
    }
    async confirmAction(message) {
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: message,
                default: false,
            },
        ]);
        return confirm;
    }
    logInfo(message) {
        console.log(chalk_1.default.blue(`[INFO] ${message}`));
    }
    logSuccess(message) {
        console.log(chalk_1.default.green(`[SUCCESS] ${message}`));
    }
    logError(message) {
        console.log(chalk_1.default.red(`[ERROR] ${message}`));
    }
}
exports.UI = UI;
