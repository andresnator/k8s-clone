import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigLoader } from './config.js';

async function setup() {
    console.log('Setting up k8s-clone configuration...');

    // 1. Initialize Config (creates default file if missing and triggers auto-detection)
    const configLoader = new ConfigLoader();
    await configLoader.init();

    // 2. Add Environment Variable
    const homeDir = os.homedir();
    const configPath = path.join(homeDir, '.k8s-clone', 'config');
    const shell = process.env.SHELL;
    let shellConfig = '';

    if (shell && shell.includes('zsh')) {
        shellConfig = path.join(homeDir, '.zshrc');
    } else if (shell && shell.includes('bash')) {
        // macOS default for bash is .bash_profile usually, linux .bashrc
        if (fs.existsSync(path.join(homeDir, '.bash_profile'))) {
            shellConfig = path.join(homeDir, '.bash_profile');
        } else {
            shellConfig = path.join(homeDir, '.bashrc');
        }
    } else {
        // Fallback for other shells or if SHELL not set
        console.warn('Could not detect shell or unknown shell. Please manually add the environment variable.');
        console.log(`export K8S_CLONE_CONFIG="${configPath}"`);
        // Try to guess commonly used files just in case
        if (fs.existsSync(path.join(homeDir, '.zshrc'))) shellConfig = path.join(homeDir, '.zshrc');
        else if (fs.existsSync(path.join(homeDir, '.bash_profile'))) shellConfig = path.join(homeDir, '.bash_profile');
    }

    if (shellConfig && fs.existsSync(shellConfig)) {
        try {
            const content = fs.readFileSync(shellConfig, 'utf-8');
            const exportLine = `export K8S_CLONE_CONFIG="${configPath}"`;

            if (!content.includes('K8S_CLONE_CONFIG')) {
                console.log(`Adding environment variable to ${shellConfig}...`);
                const comment = '\n# K8s-clone configuration file path - Used by k8s-clone tool to store cluster defaults\n';
                fs.appendFileSync(shellConfig, `${comment}${exportLine}\n`);
                console.log('Environment variable added.');
                console.log(`IMPORTANT: Please run 'source ${shellConfig}' or restart your terminal for changes to take effect.`);
            } else {
                console.log(`Environment variable already exists in ${shellConfig}.`);
            }
        } catch (err) {
            console.error(`Failed to update ${shellConfig}:`, err);
        }
    } else {
        if (shellConfig) console.warn(`Shell config file ${shellConfig} does not exist.`);
        console.log('Please manually add the following line to your shell configuration:');
        console.log(`export K8S_CLONE_CONFIG="${configPath}"`);
    }
}

setup().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
});
