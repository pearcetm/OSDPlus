# Demo pages

[Upstream GitHub Pages demos](https://pearcetm.github.io/osd-paperjs-annotation/demo/) are not shipped on npm. This repository’s [`test/demo/`](../test/demo/) pages mirror the most useful patterns.

Run locally: `npm install` then `npm run demo`, then open **http://localhost:8080/test/demo/**.

| Upstream (GitHub Pages) | Local demo |
|-------------------------|------------|
| [demo.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/demo.html) (full UI) | [annotation-toolkit.html](../test/demo/annotation-toolkit.html) |
| Custom layout (mount `.element` nodes) | [annotation-toolkit-custom-ui.html](../test/demo/annotation-toolkit-custom-ui.html) |
| [listener-api.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/listener-api.html) | [annotation-toolkit-events.html](../test/demo/annotation-toolkit-events.html) |
| Per-tool pages (brush, polygon, …) | [annotation-toolkit-toolbar-tools.html](../test/demo/annotation-toolkit-toolbar-tools.html) |
| [screenshot.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/screenshot.html) / [fieldofview.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/fieldofview.html) | [screenshot-overlay.html](../test/demo/screenshot-overlay.html) / [field-of-view-overlay.html](../test/demo/field-of-view-overlay.html) |
| [configuration.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/configuration.html) | [configuration-widget.html](../test/demo/configuration-widget.html) |
| [rotation.html](https://pearcetm.github.io/osd-paperjs-annotation/demo/rotation.html) | [rotation-control-overlay.html](../test/demo/rotation-control-overlay.html) |

Additional local-only demos: [ruler-mpp.html](../test/demo/ruler-mpp.html), [drawer-toggle.html](../test/demo/drawer-toggle.html), [multi-open.html](../test/demo/multi-open.html).
