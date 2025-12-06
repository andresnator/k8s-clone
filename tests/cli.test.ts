import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CLI', () => {
    const cliPath = join(__dirname, '..', 'dist', 'index.js');

    describe('--version flag', () => {
        it('should display version number with --version', () => {
            const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' }).trim();
            expect(output).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('should display version number with -v', () => {
            const output = execSync(`node ${cliPath} -v`, { encoding: 'utf-8' }).trim();
            expect(output).toMatch(/^\d+\.\d+\.\d+$/);
        });
    });

    describe('--help flag', () => {
        it('should display help information with --help', () => {
            const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
            expect(output).toContain('Usage: k8s-clone');
            expect(output).toContain('A CLI tool to clone and migrate Kubernetes resources across namespaces');
            expect(output).toContain('-v, --version');
            expect(output).toContain('-h, --help');
        });

        it('should display help information with -h', () => {
            const output = execSync(`node ${cliPath} -h`, { encoding: 'utf-8' });
            expect(output).toContain('Usage: k8s-clone');
            expect(output).toContain('A CLI tool to clone and migrate Kubernetes resources across namespaces');
            expect(output).toContain('-v, --version');
            expect(output).toContain('-h, --help');
        });
    });
});
