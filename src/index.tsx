import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apps = [
    {
        label: 'K8s Migrator',
        value: 'k8s-migrator',
        path: '../apps/k8s-migrator',
        command: 'npm',
        args: ['start']
    },
    {
        label: 'Wiki Agent',
        value: 'wiki-agent',
        path: '../apps/wiki-agent',
        command: 'npm',
        args: ['start']
    },
    {
        label: 'Exit',
        value: 'exit'
    }
];

const App = () => {
    const { exit } = useApp();
    const [status, setStatus] = useState<string | null>(null);

    const handleSelect = (item: typeof apps[0]) => {
        if (item.value === 'exit') {
            exit();
            process.exit(0);
        }

        const appConfig = item;
        const appPath = path.resolve(__dirname, appConfig.path!);

        if (!fs.existsSync(appPath)) {
            setStatus(`Error: Application directory not found at ${appPath}`);
            return;
        }

        setStatus(`Launching ${item.label}...`);

        // Stop Ink to release stdout
        exit();

        // We need to wait a bit for Ink to cleanup
        setTimeout(() => {
            const fullCommand = `${appConfig.command} ${appConfig.args!.join(' ')}`;
            const child = spawn(fullCommand, [], {
                cwd: appPath,
                stdio: 'inherit',
                shell: true
            });

            child.on('exit', () => {
                console.log('\nPress any key to return to menu...');
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.once('data', () => {
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    // Relaunch the app
                    run();
                });
            });
        }, 100);
    };

    return (
        <Box flexDirection="column" padding={1}>
            <Gradient name="morning">
                <BigText text="DevTools CLI" />
            </Gradient>
            <Box marginBottom={1}>
                <Text>Developer Tools Management Console</Text>
            </Box>

            <Box borderStyle="round" borderColor="cyan" padding={1} flexDirection="column">
                <Text>Select an application to launch:</Text>
                <Box marginTop={1}>
                    <SelectInput items={apps} onSelect={handleSelect} />
                </Box>
            </Box>

            {status && (
                <Box marginTop={1}>
                    <Text color="yellow">{status}</Text>
                </Box>
            )}
        </Box>
    );
};

function run() {
    console.clear();
    render(<App />);
}

run();
