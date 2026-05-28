# Build layout

OSDPlus does not patch osd-paperjs-annotation in `node_modules`. It depends on the published npm package and copies `dist/main.js` into the browser bundle at build time.

To upgrade osd-paperjs-annotation: bump the version in [`package.json`](../package.json), run `npm install`, then `npm run build`.

## npm package

- `npm run build` runs `tsup` (ESM/CJS + types) and copies the vendor file to `dist/osd-paperjs-annotation.vendor.js`.
- Published files: `dist/`, `README.md`, `LICENSE` (see `files` in `package.json`).

## Browser bundle (`dist/osdplus.min.js`)

The IIFE is a **preamble + slim app**:

1. **Preamble** (prepended verbatim, not processed by esbuild): OpenSeadragon 5.0.1 `openseadragon.js`, then osd-paperjs-annotation `dist/main.js`.
2. **Slim tail**: `OSDPlus` on `globalThis`, reading OpenSeadragon and osd-paperjs-annotation from globals via shims.

Script-tag hosts load one file: `osdplus.min.js`. The separate `osd-paperjs-annotation.vendor.js` is the same upstream `main.js` for optional split caching; demos use only the combined file.

## Globals

After load, `globalThis` exposes `OSDPlus`, `OpenSeadragon`, and osd-paperjs-annotation exports (e.g. `AnnotationToolkit`, `ConfigurationWidget`, overlay classes). Do not load a second full copy of osd-paperjs-annotation on the same page.

Configuration is in [`tsup.config.ts`](../tsup.config.ts) and [`scripts/copy-opa-vendor.mjs`](../scripts/copy-opa-vendor.mjs).
