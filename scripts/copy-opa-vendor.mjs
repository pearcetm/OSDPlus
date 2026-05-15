import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'node_modules', 'osd-paperjs-annotation', 'dist', 'main.js');
const dest = join(root, 'dist', 'osd-paperjs-annotation.vendor.js');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('Copied osd-paperjs-annotation dist → dist/osd-paperjs-annotation.vendor.js');
