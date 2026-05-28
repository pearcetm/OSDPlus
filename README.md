# OSDPlus

OpenSeadragon 5 viewer with [osd-paperjs-annotation](https://github.com/pearcetm/osd-paperjs-annotation) overlays — one npm package for bundlers, or one script tag for the browser.

**Requirements:** OpenSeadragon 5.0.1 and osd-paperjs-annotation ^0.7.6 (included as dependencies).

## Install

```bash
npm install osdplus
```

## Quick start

**npm / bundler:**

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

**Browser (jsDelivr):**

```html
<script src="https://cdn.jsdelivr.net/npm/osdplus@1.0.1/dist/osdplus.min.js"></script>
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

The bundle is about 2 MB (OpenSeadragon + osd-paperjs-annotation + wrapper). Pin the version in the URL (e.g. `@1.0.1`).

All constructor options except `paperOverlays` are passed to OpenSeadragon. If you omit `prefixUrl`, OSDPlus sets OpenSeadragon UI images from jsDelivr using the bundled OpenSeadragon version.

## paperOverlays

Overlays are opt-in under `paperOverlays`:

| Option | Description |
|--------|-------------|
| `annotationToolkit` | Annotation tools and UI. Use `{ toolbar: true, layerUI: true, layout: true }` for the built-in layout, or mount `getToolbar().element` / `getLayerUI().element` yourself. Supports `ruler` options (below). |
| `configurationWidget` | Gear dialog; not part of `order`. Built before other overlays. `storageKey` persists toolbar toggles. With `annotationToolkit`, registers an Annotations section by default (`attachAnnotationSection: false` to skip). |
| `screenshot` | Screenshot overlay |
| `fieldOfView` | Field-of-view overlay |
| `rotationControl` | Viewer rotation UI |
| `drawerToggle` | Canvas / WebGL drawer switch (`enabled: true` required). On `configurationWidget` or `paperOverlays`. |
| `order` | Construction order among overlay keys (default: annotationToolkit → fieldOfView → screenshot → rotationControl). |
| `clearAnnotationsOnViewerClose` | Default `true`: `annotationToolkit.close()` on each viewer `close` before `open()`. Set `false` to keep annotations when swapping tile sources. |

For swapping images on one viewer, see [docs/developing.md](docs/developing.md#switching-tile-sources-multi-open).

## Ruler options

Set under `paperOverlays.annotationToolkit.ruler` (applied by OSDPlus after the toolkit is created):

| Option | Description |
|--------|-------------|
| `syncPhysicalScaleFromTileSource` | Sync units from `tiledImage.source.mpp` on open / page / tile-source ready |
| `displayUnit` | `'mm'` (default) or `'um'` when syncing |
| `decimals` | Decimal places for measurements |
| `roundingMode` | `'round'` or `'truncate'` |
| `strokeWidthPixels`, `haloExtraPixels`, `labelFontSize` | Line / halo / label defaults |
| `unitsPerPixel`, `labelUnit` | Manual scale (overwritten on mpp sync when sync is enabled) |

```js
ruler: {
  syncPhysicalScaleFromTileSource: true,
  displayUnit: 'mm',
  decimals: 3,
  roundingMode: 'truncate',
}
```

## API notes

- Import `OpenSeadragon` from `osdplus` to match the bundled version (subclass `TileSource`, etc.).
- Re-exports include `AnnotationToolkit`, `ConfigurationWidget`, overlay classes, ruler helpers, and `GammaVibranceWebGLDrawer`.
- For other osd-paperjs-annotation types, use the `OSDPaperjsAnnotation` namespace from `osdplus` or import from `osd-paperjs-annotation` alongside `osdplus`.

TypeScript: `OSDPlusOptions`, `PaperOverlaysOptions`, `RulerToolkitOptions`, and related types are exported from `osdplus`.

## Gamma / vibrance drawer (experimental)

```ts
import { OSDPlus, GammaVibranceWebGLDrawer } from 'osdplus';

const viewer = new OSDPlus({
  id: 'viewer',
  tileSources: '...',
  drawer: [GammaVibranceWebGLDrawer, 'canvas'],
  drawerOptions: { gamma: 1.0, vibrance: 0.0 },
});

viewer.drawer?.setGamma?.(1.2);
```

Do not use `drawerToggle` with a custom drawer class; add configuration sections instead.

## Documentation

- [docs/developing.md](docs/developing.md) — local demos, multi-open, advanced examples
- [docs/demos.md](docs/demos.md) — demo page index
- [docs/releasing.md](docs/releasing.md) — npm releases (maintainers)
- [docs/build.md](docs/build.md) — bundle layout (contributors)
- [osd-paperjs-annotation](https://github.com/pearcetm/osd-paperjs-annotation) — upstream API and demos

## License

MIT. Runtime bundles include OpenSeadragon (BSD-3-Clause), osd-paperjs-annotation (MIT), and Paper.js (MIT).
