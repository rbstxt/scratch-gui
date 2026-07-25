import {spawnSync} from 'child_process';
import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const patchPath = resolve(rootDirectory, 'patches', 'scratch-paint-lasso.patch');

const runGitApply = args => spawnSync(
    'git',
    [
        'apply',
        '--directory=node_modules/scratch-paint',
        '--unidiff-zero',
        '--whitespace=nowarn',
        ...args,
        patchPath
    ],
    {
        cwd: rootDirectory,
        encoding: 'utf8'
    }
);

const check = runGitApply(['--check']);
if (check.status === 0) {
    const apply = runGitApply([]);
    if (apply.status !== 0) {
        process.stderr.write(apply.stderr);
        process.exit(apply.status || 1);
    }
    process.stdout.write('Applied scratch-paint Lasso patch.\n');
} else {
    const reverseCheck = runGitApply(['--reverse', '--check']);
    if (reverseCheck.status === 0) {
        process.stdout.write('scratch-paint Lasso patch is already applied.\n');
    } else {
        process.stderr.write(
            'Unable to apply the scratch-paint Lasso patch. ' +
            'The scratch-paint dependency no longer matches the expected revision.\n'
        );
        process.stderr.write(check.stderr);
        process.exit(check.status || 1);
    }
}
