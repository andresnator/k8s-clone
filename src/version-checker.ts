import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import semver from 'semver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface VersionCheckResult {
    currentVersion: string;
    latestVersion?: string;
    hasUpdate: boolean;
    error?: string;
}

/**
 * Get the current version from package.json
 */
export function getCurrentVersion(): string {
    try {
        const packageJsonPath = join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version;
    } catch (error) {
        // Fallback to dist/package.json if running from dist
        try {
            const packageJsonPath = join(__dirname, 'package.json');
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            return packageJson.version;
        } catch {
            return '0.0.0';
        }
    }
}

/**
 * Fetch the latest version from npm registry
 * @param packageName The name of the package
 * @param timeout Timeout in milliseconds (default: 3000)
 */
export async function fetchLatestVersion(
    packageName: string,
    timeout: number = 3000
): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.version || null;
    } catch (error) {
        // Silently fail on network errors
        return null;
    }
}

/**
 * Check if a version update is available
 * @param packageName The name of the package
 */
export async function checkForUpdate(packageName: string): Promise<VersionCheckResult> {
    const currentVersion = getCurrentVersion();
    
    // Check if version check should be skipped
    if (process.env.K8S_CLONE_SKIP_VERSION_CHECK === 'true') {
        return {
            currentVersion,
            hasUpdate: false,
        };
    }

    try {
        const latestVersion = await fetchLatestVersion(packageName);

        if (!latestVersion) {
            return {
                currentVersion,
                hasUpdate: false,
            };
        }

        // Compare versions using semver
        const hasUpdate = semver.gt(latestVersion, currentVersion);

        return {
            currentVersion,
            latestVersion,
            hasUpdate,
        };
    } catch (error) {
        return {
            currentVersion,
            hasUpdate: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

const BANNER_WIDTH = 70;

/**
 * Format the update notification message
 * @param result The version check result
 * @param packageName The name of the package
 */
export function formatUpdateMessage(result: VersionCheckResult, packageName: string): string {
    if (!result.hasUpdate || !result.latestVersion) {
        return '';
    }

    const line1 = `There is a newer version (v${result.latestVersion}) of ${packageName}`;
    const line2 = `To update, run: npm install -g ${packageName}`;

    return `
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ¡UPDATE AVAILABLE!                                                    │
│                                                                        │
│  ${line1.padEnd(BANNER_WIDTH, ' ')}│
│                                                                        │
│  ${line2.padEnd(BANNER_WIDTH, ' ')}│
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
`;
}
