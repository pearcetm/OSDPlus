# Developing locally

```bash
npm install
npm run build   # optional; demo script builds first
npm run demo
```

Open **http://localhost:8080/test/demo/** for the demo hub. Demos load [`dist/osdplus.min.js`](../dist/osdplus.min.js) and [test/demo/assets/demo-tiles.js](../test/demo/assets/demo-tiles.js) for a shared CORS-friendly IIIF tile source.

See [demos.md](demos.md) for a full list of demo pages.

## Switching tile sources (multi-open)

Use one `OSDPlus` instance and call `viewer.open(nextTileSources)` when the user loads a new image. OpenSeadragon fires `close` before each `open`.

| Event | Behavior |
|-------|----------|
| `close` (before each `open`) | If `annotationToolkit` is enabled and `clearAnnotationsOnViewerClose` is not `false`, calls `annotationToolkit.close()` (clears annotations, keeps UI). |
| `destroy` | Tears down all overlays and the configuration widget. |

Only call `viewer.destroy()` when removing the viewer from the page. To keep annotations across `open()`, set `clearAnnotationsOnViewerClose: false` and consider `cacheAnnotations: true` on `paperOverlays.annotationToolkit` (upstream option).

Example: [multi-open.html](../test/demo/multi-open.html).

## Configuration widget: custom sections

`ConfigurationWidget#addSection(label, element)` adds a block to the gear dialog. Example with `GammaVibranceWebGLDrawer`:

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

Full example: [configuration-widget.html](../test/demo/configuration-widget.html).

Toolbar visibility persistence uses `ANNOTATION_TOOLBAR_PERSIST_ID_PENCIL` and `ANNOTATION_TOOLBAR_PERSIST_ID_FILE` (re-exported from `osdplus`) in the same JSON document as overlay rows when `storageKey` is set.

## Drawer toggle (detail)

Enable `drawerToggle` on `configurationWidget` or at `paperOverlays` (requires `enabled: true`). Options: `defaultDrawer`, `persistKey`, `storageKey`, `persist`, `choices`. Switches stock OpenSeadragon `'canvas'` / `'webgl'` drawers only — not custom drawer classes.

Demo: [drawer-toggle.html](../test/demo/drawer-toggle.html).

## Ruler options (detail)

OSDPlus applies `paperOverlays.annotationToolkit.ruler` after toolkit creation. See the README ruler table. Helpers re-exported from `osdplus`: `applyRulerToolkitOptions`, `extractRulerOptions`, `mppFromTiledImage`, `mppFromActiveViewerImage`, `applyRulerPhysicalScaleFromMpp`.

Demo: [ruler-mpp.html](../test/demo/ruler-mpp.html).
