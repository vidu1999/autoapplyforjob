import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, 'extension', 'dist');
const outputPath = path.join(root, 'autoapply-ai-extension.zip');

if (!fs.existsSync(path.join(source, 'manifest.json'))) {
  throw new Error('Extension build not found. Run npm run build first.');
}

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });
archive.pipe(output);
archive.directory(source, false);
await archive.finalize();
console.log(`Created ${outputPath}`);
