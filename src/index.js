"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inquirer_1 = __importDefault(require("inquirer"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
// Define the available applications
const apps = [
    {
        name: 'K8s Migrator',
        value: 'k8s-migrator',
        path: '../../', // Go up two levels from src/ or dist/ to repo root
        command: 'npm',
        args: ['start']
    },
    {
        name: 'Wiki Agent',
        value: 'wiki-agent',
        path: '../../wiki-agent', // Go up two levels then into wiki-agent
        command: 'npm',
        args: ['start']
    }
];
async function main() {
    console.clear();
    console.log(chalk_1.default.blue.bold('========================================='));
    console.log(chalk_1.default.blue.bold('        DevTools CLI - Main Menu        '));
    console.log(chalk_1.default.blue.bold('========================================='));
    console.log('');
    const { selectedApp } = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'selectedApp',
            message: 'Select an application to launch:',
            choices: [
                ...apps.map(app => ({ name: app.name, value: app.value })),
                new inquirer_1.default.Separator(),
                { name: 'Exit', value: 'exit' }
            ]
        }
    ]);
    if (selectedApp === 'exit') {
        console.log('Goodbye!');
        process.exit(0);
    }
    const appConfig = apps.find(app => app.value === selectedApp);
    if (appConfig) {
        runApp(appConfig);
    }
}
function runApp(appConfig) {
    console.log(chalk_1.default.green(`\nLaunching ${appConfig.name}...\n`));
    const appPath = path_1.default.resolve(__dirname, appConfig.path);
    // Spawn the child process
    // stdio: 'inherit' allows the child app to take over the terminal input/output
    const child = (0, child_process_1.spawn)(appConfig.command, appConfig.args, {
        cwd: appPath,
        stdio: 'inherit',
        shell: true
    });
    child.on('error', (err) => {
        console.error(chalk_1.default.red(`Failed to start ${appConfig.name}:`), err);
    });
    child.on('exit', (code) => {
        console.log(chalk_1.default.yellow(`\n${appConfig.name} exited with code ${code}`));
        console.log('Press any key to return to menu...');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => {
            process.stdin.setRawMode(false);
            main(); // Return to main menu
        });
    });
}
main().catch(console.error);
