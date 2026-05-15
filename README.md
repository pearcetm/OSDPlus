# OSDPlus

Single entry for an [OpenSeadragon](https://openseadragon.github.io/) viewer with [osd-paperjs-annotation](https://github.com/pearcetm/osd-paperjs-annotation) wired in. OSDPlus currently pins **OpenSeadragon 5.0.1** (not 6.x): osd-paperjs-annotation v0.7.1’s rotation overlay and mouse navigation behave correctly on 5.x; OpenSeadragon 6.0.2 has tracker API changes that break deactivate/restore until upstream adapts.

With **npm**, install one package and import `osdplus`—your bundler resolves OpenSeadragon **5.0.1** and osd-paperjs-annotation as dependencies. With **script tags**, load a single [`dist/osdplus.min.js`](dist/osdplus.min.js): the published IIFE prepends **OpenSeadragon 5.0.1** and a **verbatim** copy of osd-paperjs-annotation’s webpack bundle, then the slim app (see [CDN](#cdn-jsdelivr)). That keeps Paper.js safe (the app is not fed through esbuild) while staying a one-stop script for the browser.

```js
const viewer = new OSDPlus({
  id: 'viewer',
  crossOriginPolicy: 'Anonymous',
  tileSources:
    'https://iiif.io/api/image/3.0/example/reference/28473c77da3deebe4375c3a50572d9d3-laocoon/info.json',
  paperOverlays: {
    annotationToolkit: { toolbar: true, layerUI: true, layout: true },
  },
});
```

- `paperOverlays.annotationToolkit: true` (or `{}`) enables the toolkit **without** osd-paperjs-annotation’s stock chrome; set `toolbar`, `layerUI`, and/or `layout` to `true` (or option objects) for the built-in UI, or mount `getToolbar().element` / `getLayerUI().element` yourself after `open` (see local demos).
- The IIIF URL above is the public [iiif.io](https://iiif.io/api/image/3.0/example/reference/) reference image service (`Access-Control-Allow-Origin: *`). Use `crossOriginPolicy: 'Anonymous'` for cross-origin tiles when canvas or Paper.js reads pixels. Local demos load the same URL via [test/demo/assets/demo-tiles.js](test/demo/assets/demo-tiles.js) as `window.OSDPLUS_DEMO_TILE_SOURCE`.
- All options except `paperOverlays` are passed to OpenSeadragon (after stripping `paperOverlays`).
- If you omit `prefixUrl`, OSDPlus sets it to the matching OpenSeadragon UI images on [jsDelivr](https://www.jsdelivr.com/) using `OpenSeadragon.version` at runtime.

## Opt-in overlays

Overlays are **opt-in** under `paperOverlays`:

- `configurationWidget`: `true | { storageKey?, attachAnnotationSection? }` — gear dialog from osd-paperjs-annotation v0.7.1+. **Not** part of `order`. When enabled, OSDPlus constructs it **before** other overlays so they can auto-register (toolbar visibility, activate/deactivate). `storageKey` enables localStorage persistence for “Show button” toggles; omit or use `null` to disable. When `annotationToolkit` is also enabled, `attachAnnotationSection` defaults to `true` and OSDPlus calls `annotationToolkit.registerWithConfigurationWidget(configurationWidget)` after the toolkit is created (requires stock annotation UI so pencil and/or save buttons exist; see upstream [annotations README](https://github.com/pearcetm/osd-paperjs-annotation/blob/v0.7.1/src/js/overlays/annotations/README.md)).
- `annotationToolkit`: `true | { ...options }`
- `screenshot`: `true | { ...options }` (upstream supports `registerWithConfig`, `showButton`, etc.)
- `fieldOfView`: `true | { ...options }` (same overlay options as upstream)
- `rotationControl`: `true | { ...options }` — `RotationControlOverlay` (viewer rotation UI); same `registerWithConfig` / `showButton` pattern as other `ViewerOverlayBase` overlays.
- `order`: optional construction order for **overlay** keys only: `annotationToolkit`, `fieldOfView`, `screenshot`, `rotationControl`. Default when omitted: that sequence filtered to enabled keys. If present, it must be a permutation of the enabled overlays.

## Install (npm)

```bash
npm install osdplus
```

```ts
import { OSDPlus } from 'osdplus';

const viewer = new OSDPlus({
  id: 'viewer',
  crossOriginPolicy: 'Anonymous',
  tileSources:
    'https://iiif.io/api/image/3.0/example/reference/28473c77da3deebe4375c3a50572d9d3-laocoon/info.json',
  paperOverlays: {
    annotationToolkit: { toolbar: true, layerUI: true, layout: true },
  },
});
```

Types: `OSDPlusOptions`, `PaperOverlaysOptions`, `PaperOverlaysOrderItem`, `ConfigurationWidgetOptions`, `RotationControlOverlayOptions`.

### OpenSeadragon re-export

Use the same OpenSeadragon instance the package depends on (subclass `TileSource`, access enums, use helpers, etc.):

```ts
import { OSDPlus, OpenSeadragon } from 'osdplus';

class MyTileSource extends OpenSeadragon.TileSource {
  constructor(width: number, height: number, tileSize: number, tileOverlap: number, minLevel: number, maxLevel: number) {
    super({ width, height, tileSize, tileOverlap, minLevel, maxLevel });
  }
  // ...
}
```

`openseadragon` remains a dependency of `osdplus`; listing it as a **direct** dependency in your app is optional but gives you an explicit semver pin in larger projects.

### osd-paperjs-annotation: named exports and `OSDPaperjsAnnotation`

`osdplus` re-exports the main overlay and toolkit symbols (`AnnotationToolkit`, `ConfigurationWidget`, overlays, `attachAnnotationToolkitConfigurationWidget`, …). For other upstream entry points (e.g. `ToolBase`, `AnnotationLayout`, `LayerUI`), import the **`OSDPaperjsAnnotation`** namespace object from `osdplus` and read properties off it at runtime (same shape as upstream’s script-tag `OSDPaperjsAnnotation`):

```ts
import { OSDPaperjsAnnotation } from 'osdplus';

// Runtime access to upstream classes not individually re-exported from osdplus:
const ToolBase = OSDPaperjsAnnotation.ToolBase;
const AnnotationLayout = OSDPaperjsAnnotation.AnnotationLayout;
```

Nested keys are not strongly typed on `OSDPaperjsAnnotation` in this package’s shims; for full typings you can still import from `'osd-paperjs-annotation'` alongside `osdplus` if your bundler resolves one copy.

### Configuration widget: custom sections (e.g. gamma / vibrance)

`ConfigurationWidget#addSection(label, element)` appends a block to the gear dialog. With `GammaVibranceWebGLDrawer` as the viewer drawer, wire range inputs to `setGamma` / `setVibrance` (or `setGammaVibrance`). See [test/demo/configuration-widget.html](test/demo/configuration-widget.html).

```js
viewer.addOnceHandler('open', () => {
  const cw = viewer.configurationWidget;
  if (!cw) return;
  const root = document.createElement('div');
  const g = document.createElement('input');
  g.type = 'range';
  g.addEventListener('input', () => viewer.drawer?.setGamma?.(Number(g.value)));
  root.appendChild(g);
  cw.addSection('Display', root);
});
```

Persistence for annotation toolbar rows uses `ANNOTATION_TOOLBAR_PERSIST_ID_PENCIL` and `ANNOTATION_TOOLBAR_PERSIST_ID_FILE` (re-exported from `osdplus`); they share the same JSON document as overlay rows when `storageKey` is set.

## Gamma/vibrance WebGL drawer (experimental)

This package also exports `GammaVibranceWebGLDrawer`, a subclass of OpenSeadragon 5’s `WebGLDrawer` that applies
gamma and vibrance adjustments in a fragment shader (uniform-driven, intended for “close enough” parity).

```ts
import { OSDPlus, GammaVibranceWebGLDrawer } from 'osdplus';

const viewer = new OSDPlus({
  id: 'viewer',
  tileSources: '...',
  drawer: [GammaVibranceWebGLDrawer, 'canvas'],
  drawerOptions: { gamma: 1.0, vibrance: 0.0 },
});

viewer.drawer?.setGamma?.(1.2);
viewer.drawer?.setVibrance?.(0.4);
```

This drawer applies gamma/vibrance in the **first-pass** WebGL tile-composition shader, so it works for fully opaque
images without forcing two-pass rendering.

Use `GammaVibranceWebGLDrawer#getGammaVibranceInstallStatus()` (typed as `GammaVibranceInstallStatus`) if the image stays blank—failed installs keep OpenSeadragon’s stock first-pass program instead of replacing it with a broken one.

## CDN (jsDelivr)

The browser file [`dist/osdplus.min.js`](dist/osdplus.min.js) is built as a **preamble + slim IIFE**:

1. **Preamble** (prepended at build time, not transformed by esbuild): OpenSeadragon **5.0.1**’s published `openseadragon.js`, then osd-paperjs-annotation’s **`dist/main.js` verbatim** (same bytes as npm). Together they define everything on `globalThis` that Paper and the overlays expect.
2. **Slim tail**: `globalName` **`OSDPlus`**, tree-shake off, minify off; it reads `openseadragon` and `osd-paperjs-annotation` from `globalThis` via virtual shims (nothing from upstream’s webpack blob is re-parsed by esbuild).

So script-tag integration is **one** `<script src=".../osdplus.min.js">` after your tile/config scripts. The build also writes [`dist/osd-paperjs-annotation.vendor.js`](dist/osd-paperjs-annotation.vendor.js), a **standalone verbatim** copy of the same upstream `main.js` used in the preamble (for npm `files` or rare split-cache scenarios). Local demos use only the combined `osdplus.min.js`.

**npm ESM/CJS** is unchanged: `import { OSDPlus } from 'osdplus'` still resolves the real packages through your bundler.

After publishing to npm:

```html
<script src="https://cdn.jsdelivr.net/npm/osdplus@1/dist/osdplus.min.js"></script>
<script>
  const viewer = new OSDPlus({
    id: 'viewer',
    crossOriginPolicy: 'Anonymous',
    tileSources:
      'https://iiif.io/api/image/3.0/example/reference/28473c77da3deebe4375c3a50572d9d3-laocoon/info.json',
    paperOverlays: {
      annotationToolkit: { toolbar: true, layerUI: true, layout: true },
    },
  });
</script>
```

The file is large (~2 MB) by design (OpenSeadragon + upstream vendor + thin wrapper).

Short URL for the IIFE (uses the `jsdelivr` field in `package.json`):

```text
https://cdn.jsdelivr.net/npm/osdplus@1
```

Pin a real version in production (replace `@1` with `@1.0.0` or similar).

## Local demo

From the repository root:

```bash
npm install
npm run demo
```

Open **http://localhost:8080/test/demo/** for the demo hub. Viewer demos load a single [`dist/osdplus.min.js`](dist/osdplus.min.js) (see each HTML file) plus [test/demo/assets/demo-tiles.js](test/demo/assets/demo-tiles.js) for a shared CORS-friendly IIIF tile source.

### Upstream osd-paperjs-annotation demos

[Upstream GitHub Pages demos](https://pearcetm.github.io/osd-paperjs-annotation/demo/) are not shipped on npm; this repo’s `test/demo/` pages mirror the most useful patterns:

| Upstream (GitHub Pages) | Local demo |
|-------------------------|------------|
| [demo.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/demo.html) (full UI) | [test/demo/annotation-toolkit.html](test/demo/annotation-toolkit.html) |
| Custom layout (mount `.element` nodes; see upstream JSDoc) | [test/demo/annotation-toolkit-custom-ui.html](test/demo/annotation-toolkit-custom-ui.html) |
| [listener-api.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/listener-api.html) | [test/demo/annotation-toolkit-events.html](test/demo/annotation-toolkit-events.html) |
| Per-tool pages (brush, polygon, …) | [test/demo/annotation-toolkit-toolbar-tools.html](test/demo/annotation-toolkit-toolbar-tools.html) (`toolbar: { tools: [...] }`) |
| [screenshot.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/screenshot.html) / [fieldofview.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/fieldofview.html) | [test/demo/screenshot-overlay.html](test/demo/screenshot-overlay.html) / [test/demo/field-of-view-overlay.html](test/demo/field-of-view-overlay.html) |
| [configuration.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/configuration.html) | [test/demo/configuration-widget.html](test/demo/configuration-widget.html) |
| [rotation.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/rotation.html) | [test/demo/rotation-control-overlay.html](test/demo/rotation-control-overlay.html) |

## IIFE globals

The combined [`dist/osdplus.min.js`](dist/osdplus.min.js) runs the **preamble** first (OpenSeadragon + osd-paperjs-annotation on `globalThis`), then the **slim** IIFE: it defines **`OSDPlus`** (`globalName`; a small footer unwraps the constructor if esbuild emits an interop object), ensures **`OpenSeadragon`** is on `globalThis`, and mirrors osd-paperjs-annotation named exports (e.g. `AnnotationToolkit`, `ConfigurationWidget`, `ScreenshotOverlay`, `FieldOfViewOverlay`, `RotationControlOverlay`, `attachAnnotationToolkitConfigurationWidget`, …) plus **`GammaVibranceWebGLDrawer`** for parity with the npm entry. Avoid loading another full copy of osd-paperjs-annotation’s bundle on the same page unless you know globals will not clash.

## Licenses

OSDPlus is MIT. Bundled upstream licenses apply at runtime (OpenSeadragon BSD-3-Clause, osd-paperjs-annotation MIT, Paper.js MIT). See each dependency’s `package.json` and repository.

## Release & npm publish

1. Bump `version` in `package.json`.
2. Create and push a git tag `v*` matching that version (for example `v1.0.1`).
3. Configure the **`NPM_TOKEN`** secret on the GitHub repository.
4. CI runs `npm run build` on every push/PR; on a **`v*`** tag push it also runs `npm publish`.

If you prefer publishing manually, run `npm publish` locally after `npm run build`.
