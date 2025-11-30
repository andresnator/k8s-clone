import inquirer from 'inquirer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import figlet from 'figlet';

// Define the available applications
const apps = [
    {
        name: 'K8s Migrator',
        value: 'k8s-migrator',
        path: '../apps/k8s-migrator',
        command: 'npm',
        args: ['start']
    },
    {
        name: 'Wiki Agent',
        value: 'wiki-agent',
        path: '../apps/wiki-agent',
        command: 'npm',
        args: ['start']
    }
];

async function main() {
    console.clear();
    console.log(
        chalk.cyan(
            figlet.textSync('DevTools CLI', { horizontalLayout: 'full' })
        )
    );
    console.log(chalk.yellow('        Developer Tools Management Console        '));
    console.log(chalk.blue('=================================================='));
    console.log('');

    const { selectedApp } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedApp',
            message: 'Select an application to launch:',
            choices: [
                ...apps.map(app => ({ name: app.name, value: app.value })),
                new inquirer.Separator(),
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

function runApp(appConfig: any) {
    console.log(chalk.green(`\nLaunching ${appConfig.name}...\n`));

    const appPath = path.resolve(__dirname, appConfig.path);

    if (!fs.existsSync(appPath)) {
        console.error(chalk.red(`Error: Application directory not found at ${appPath}`));
        console.log('Press any key to return to menu...');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.once('data', () => {
            process.stdin.setRawMode(false);
            main();
        });
        return;
    }

    // Spawn the child process
    // stdio: 'inherit' allows the child app to take over the terminal input/output
    const fullCommand = `${appConfig.command} ${appConfig.args.join(' ')}`;
    const child = spawn(fullCommand, [], {
        cwd: appPath,
        stdio: 'inherit',
        shell: true
    });

    child.on('error', (err) => {
        console.error(chalk.red(`Failed to start ${appConfig.name}:`), err);
    });

    child.on('exit', (code) => {
        console.log(chalk.yellow(`\n${appConfig.name} exited with code ${code}`));
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
