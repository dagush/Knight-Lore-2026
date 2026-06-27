import {copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const root = process.cwd();
const outputDir = join(root, 'pages-dist');
const distJsspeccyDir = join(root, 'dist', 'jsspeccy');
const requiredFiles = [
    join(root, 'static', 'knight-lore-2026.html'),
    join(root, 'static', 'knight-lore-2026-banner.png'),
    join(root, 'static', 'favicon.ico'),
    join(distJsspeccyDir, 'jsspeccy.js'),
    join(distJsspeccyDir, 'jsspeccy-worker.js'),
    join(distJsspeccyDir, 'jsspeccy-core.wasm'),
];
const forbiddenSnapshotExtensions = new Set([
    '.z80',
    '.sna',
    '.szx',
    '.tap',
    '.tzx',
    '.dsk',
    '.scr',
]);
const removableArtifactFiles = new Set([
    '.DS_Store',
    'Thumbs.db',
]);

function assertExists(path) {
    if (!existsSync(path)) {
        throw new Error('Missing required Pages input: ' + path);
    }
}

function walkFiles(dir) {
    const entries = readdirSync(dir, {withFileTypes: true});
    return entries.flatMap(entry => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return walkFiles(path);
        if (entry.isFile()) return [path];
        return [];
    });
}

function hasForbiddenExtension(path) {
    const lower = path.toLowerCase();
    if (lower.includes('/jsspeccy/tapeloaders/')) return false;
    return [...forbiddenSnapshotExtensions].some(extension => lower.endsWith(extension));
}

function removeArtifactCruft(dir) {
    walkFiles(dir)
        .filter(file => removableArtifactFiles.has(file.split('/').pop()))
        .forEach(file => rmSync(file, {force: true}));
}

requiredFiles.forEach(assertExists);

rmSync(outputDir, {recursive: true, force: true});
mkdirSync(outputDir, {recursive: true});

copyFileSync(join(root, 'static', 'knight-lore-2026.html'), join(outputDir, 'index.html'));
copyFileSync(join(root, 'static', 'knight-lore-2026-banner.png'), join(outputDir, 'knight-lore-2026-banner.png'));
copyFileSync(join(root, 'static', 'favicon.ico'), join(outputDir, 'favicon.ico'));
cpSync(distJsspeccyDir, join(outputDir, 'jsspeccy'), {recursive: true});
writeFileSync(join(outputDir, '.nojekyll'), '');
removeArtifactCruft(outputDir);

const artifactFiles = walkFiles(outputDir);
const forbiddenFiles = artifactFiles.filter(hasForbiddenExtension);
if (forbiddenFiles.length > 0) {
    throw new Error(
        'Pages artifact contains snapshot/tape/media files that should not be published:\n'
        + forbiddenFiles.map(file => '  - ' + file).join('\n')
    );
}

const totalBytes = artifactFiles.reduce((sum, file) => sum + statSync(file).size, 0);
console.log('GitHub Pages artifact ready: ' + outputDir);
console.log('Files: ' + artifactFiles.length + ', bytes: ' + totalBytes);
