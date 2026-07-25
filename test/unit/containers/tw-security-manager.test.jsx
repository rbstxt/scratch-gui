import {
    TWSecurityManagerComponent
} from '../../../src/containers/tw-security-manager.jsx';

const createManager = developerMode => new TWSecurityManagerComponent({
    developerMode,
    securityManager: {},
    vm: {
        extensionManager: {
            securityManager: {}
        }
    }
});

describe('TurboWarp security manager', () => {
    test('uses a sandbox for untrusted extensions by default', () => {
        const manager = createManager(false);
        expect(manager.getSandboxMode('https://example.com/extension.js')).toBe('iframe');
    });

    test('developer mode restores permissive extension behavior', async () => {
        const manager = createManager(true);
        const url = 'https://example.com/extension.js';
        expect(manager.getSandboxMode(url)).toBe('unsandboxed');
        await expect(manager.canLoadExtensionFromProject(url)).resolves.toBe(true);
        await expect(manager.canFetch('ftp://example.com/file')).resolves.toBe(true);
        await expect(manager.canOpenWindow('ftp://example.com/file')).resolves.toBe(true);
        await expect(manager.canRecordAudio()).resolves.toBe(true);
        manager.props = {
            ...manager.props,
            developerMode: false
        };
        expect(manager.getSandboxMode(url)).toBe('iframe');
    });

    test('rejects unsafe protocols by default without showing a prompt', async () => {
        const manager = createManager(false);
        manager.acquireModalLock = jest.fn();
        await expect(manager.canFetch('ftp://example.com/file')).resolves.toBe(false);
        await expect(manager.canOpenWindow('ftp://example.com/file')).resolves.toBe(false);
        expect(manager.acquireModalLock).not.toHaveBeenCalled();
    });
});
