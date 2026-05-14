import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string;
};

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'browser',
    target: 'es2020',
    outDir: 'dist',
    external: ['openseadragon', 'osd-paperjs-annotation'],
  },
  {
    entry: { 'osdplus.min': 'src/iife-entry.ts' },
    format: ['iife'],
    globalName: 'OSDPlus',
    minify: true,
    sourcemap: true,
    treeshake: true,
    platform: 'browser',
    target: 'es2020',
    outDir: 'dist',
    outExtension() {
      return { js: '.js' };
    },
    banner: {
      js: `/*! osdplus v${pkg.version ?? '0.0.0'} | MIT | https://github.com/pearcetm/OSDPlus */`,
    },
  },
]);
