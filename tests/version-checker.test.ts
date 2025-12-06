import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock fs module
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
}));

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Import after mocking
const {
    getCurrentVersion,
    fetchLatestVersion,
    checkForUpdate,
    formatUpdateMessage,
} = await import('../src/version-checker.js');

describe('version-checker', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.K8S_CLONE_SKIP_VERSION_CHECK;
    });

    describe('getCurrentVersion', () => {
        it('should return the current version from package.json', () => {
            mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

            const version = getCurrentVersion();

            expect(version).toBe('1.0.0');
        });

        it('should return 0.0.0 if package.json cannot be read', () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            const version = getCurrentVersion();

            expect(version).toBe('0.0.0');
        });
    });

    describe('fetchLatestVersion', () => {
        it('should fetch the latest version from npm registry', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ version: '1.1.0' }),
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const version = await fetchLatestVersion('@test/package');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://registry.npmjs.org/@test/package/latest',
                expect.objectContaining({
                    headers: { 'Accept': 'application/json' },
                })
            );
            expect(version).toBe('1.1.0');
        });

        it('should return null if the fetch fails', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const version = await fetchLatestVersion('@test/package');

            expect(version).toBeNull();
        });

        it('should return null if the response is not ok', async () => {
            const mockResponse = {
                ok: false,
            } as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const version = await fetchLatestVersion('@test/package');

            expect(version).toBeNull();
        });

        it('should timeout after specified duration', async () => {
            mockFetch.mockImplementation((url, options) => {
                return new Promise((resolve, reject) => {
                    const signal = (options as any)?.signal;
                    if (signal) {
                        signal.addEventListener('abort', () => {
                            reject(new Error('Aborted'));
                        });
                    }
                    // Never resolve to simulate a hanging request
                });
            });

            const version = await fetchLatestVersion('@test/package', 100);

            expect(version).toBeNull();
        });
    });

    describe('checkForUpdate', () => {
        it('should return update available when newer version exists', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ version: '1.1.0' }),
            } as unknown as Response;
            mockFetch.mockResolvedValue(mockResponse);

            const result = await checkForUpdate('@test/package');

            expect(result.currentVersion).toBe('1.0.0');
            expect(result.latestVersion).toBe('1.1.0');
            expect(result.hasUpdate).toBe(true);
        });

        it('should return no update when versions are equal', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ version: '1.0.0' }),
            } as unknown as Response;
            mockFetch.mockResolvedValue(mockResponse);

            const result = await checkForUpdate('@test/package');

            expect(result.currentVersion).toBe('1.0.0');
            expect(result.latestVersion).toBe('1.0.0');
            expect(result.hasUpdate).toBe(false);
        });

        it('should return no update when current version is newer', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify({ version: '2.0.0' }));
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({ version: '1.0.0' }),
            } as unknown as Response;
            mockFetch.mockResolvedValue(mockResponse);

            const result = await checkForUpdate('@test/package');

            expect(result.currentVersion).toBe('2.0.0');
            expect(result.latestVersion).toBe('1.0.0');
            expect(result.hasUpdate).toBe(false);
        });

        it('should return no update when fetch fails', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
            mockFetch.mockRejectedValue(new Error('Network error'));

            const result = await checkForUpdate('@test/package');

            expect(result.currentVersion).toBe('1.0.0');
            expect(result.hasUpdate).toBe(false);
        });

        it('should skip version check when K8S_CLONE_SKIP_VERSION_CHECK is set', async () => {
            process.env.K8S_CLONE_SKIP_VERSION_CHECK = 'true';
            mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));

            const result = await checkForUpdate('@test/package');

            expect(result.currentVersion).toBe('1.0.0');
            expect(result.hasUpdate).toBe(false);
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('formatUpdateMessage', () => {
        it('should format update message when update is available', () => {
            const result = {
                currentVersion: '1.0.0',
                latestVersion: '1.1.5',
                hasUpdate: true,
            };

            const message = formatUpdateMessage(result, '@andresnator/k8s-clone');

            expect(message).toContain('¡UPDATE AVAILABLE!');
            expect(message).toContain('v1.1.5');
            expect(message).toContain('npm install -g @andresnator/k8s-clone');
        });

        it('should return empty string when no update is available', () => {
            const result = {
                currentVersion: '1.0.0',
                hasUpdate: false,
            };

            const message = formatUpdateMessage(result, '@andresnator/k8s-clone');

            expect(message).toBe('');
        });

        it('should return empty string when latestVersion is not provided', () => {
            const result = {
                currentVersion: '1.0.0',
                hasUpdate: true,
            };

            const message = formatUpdateMessage(result, '@andresnator/k8s-clone');

            expect(message).toBe('');
        });
    });
});
