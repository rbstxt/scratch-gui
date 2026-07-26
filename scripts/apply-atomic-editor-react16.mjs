import {readFile, writeFile} from 'node:fs/promises';

const packageUrl = new URL('../node_modules/@atomic-editor/editor/package.json', import.meta.url);
const installLockUrl = new URL('../node_modules/.package-lock.json', import.meta.url);
const supportedVersion = '0.6.2';
const compatibleReactRange = '^16.14.0 || ^18.0.0 || ^19.0.0';

const applyCompatiblePeers = peerDependencies => ({
    ...peerDependencies,
    'react': compatibleReactRange,
    'react-dom': compatibleReactRange
});

const packageJson = JSON.parse(await readFile(packageUrl, 'utf8'));
if (packageJson.version !== supportedVersion) {
    throw new Error(
        `Unsupported Atomic Editor version ${packageJson.version}; expected ${supportedVersion}. ` +
        'Review its React usage before updating the compatibility patch.'
    );
}

const peerDependencies = packageJson.peerDependencies || {};
if (
    peerDependencies.react === compatibleReactRange &&
    peerDependencies['react-dom'] === compatibleReactRange
) {
    console.log('Atomic Editor React 16 compatibility patch is already applied.');
} else {
    packageJson.peerDependencies = applyCompatiblePeers(peerDependencies);
    await writeFile(packageUrl, `${JSON.stringify(packageJson, null, 2)}\n`);
    console.log('Applied Atomic Editor React 16 compatibility patch.');
}

const installLock = JSON.parse(await readFile(installLockUrl, 'utf8'));
const installLockPackage = installLock.packages &&
    installLock.packages['node_modules/@atomic-editor/editor'];
if (!installLockPackage || installLockPackage.version !== supportedVersion) {
    throw new Error('Atomic Editor is missing from node_modules/.package-lock.json.');
}
installLockPackage.peerDependencies = applyCompatiblePeers(installLockPackage.peerDependencies);
await writeFile(installLockUrl, `${JSON.stringify(installLock, null, 2)}\n`);
