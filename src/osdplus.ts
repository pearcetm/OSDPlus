import OpenSeadragon from 'openseadragon';
import {
  AnnotationToolkit,
  ConfigurationWidget,
  FieldOfViewOverlay,
  RotationControlOverlay,
  ScreenshotOverlay,
} from 'osd-paperjs-annotation';
import type {
  AnnotationToolkitOptions,
  ConfigurationWidgetOptions,
  FieldOfViewOverlayOptions,
  OSDPlusOptions,
  PaperOverlaysOrderItem,
  PaperOverlaysOptions,
  RotationControlOverlayOptions,
  ScreenshotOverlayOptions,
} from './types';
import { installDrawerToggle } from './drawerToggle';
import {
  applyRulerToolkitOptions,
  extractRulerOptions,
  installRulerPhysicalScaleSync,
} from './rulerPhysicalScale';

function splitOptions(options: OSDPlusOptions): {
  paperOverlays: PaperOverlaysOptions | undefined;
  osdOptions: OpenSeadragon.Options;
} {
  const { paperOverlays, ...osdOptions } = options;
  return { paperOverlays, osdOptions };
}

function withDefaultPrefixUrl(osdOptions: OpenSeadragon.Options): OpenSeadragon.Options {
  const prefix = osdOptions.prefixUrl;
  if (prefix != null && String(prefix).trim() !== '') {
    return osdOptions;
  }
  const v = OpenSeadragon.version.versionStr;
  return {
    ...osdOptions,
    prefixUrl: `https://cdn.jsdelivr.net/npm/openseadragon@${v}/build/openseadragon/images/`,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function enabledSet(paperOverlays: PaperOverlaysOptions | undefined): Set<PaperOverlaysOrderItem> {
  const set = new Set<PaperOverlaysOrderItem>();
  if (!paperOverlays) return set;
  if (paperOverlays.annotationToolkit !== undefined) set.add('annotationToolkit');
  if (paperOverlays.fieldOfView !== undefined) set.add('fieldOfView');
  if (paperOverlays.screenshot !== undefined) set.add('screenshot');
  if (paperOverlays.rotationControl !== undefined) set.add('rotationControl');
  return set;
}

function resolveOrder(paperOverlays: PaperOverlaysOptions | undefined): PaperOverlaysOrderItem[] {
  const enabled = enabledSet(paperOverlays);
  const preferred = [
    'annotationToolkit',
    'fieldOfView',
    'screenshot',
    'rotationControl',
  ] as const satisfies readonly PaperOverlaysOrderItem[];
  const fallback: PaperOverlaysOrderItem[] = preferred.filter((k): k is PaperOverlaysOrderItem => enabled.has(k));

  const order = paperOverlays?.order;
  if (!order) return fallback;

  const orderSet = new Set(order);
  const enabledArr = [...enabled];
  const valid =
    order.length === enabled.size &&
    order.every((k) => enabled.has(k)) &&
    orderSet.size === order.length &&
    enabledArr.every((k) => orderSet.has(k));

  if (!valid) {
    throw new Error(
      `paperOverlays.order must be a permutation of enabled overlays: ${enabledArr.join(', ')}`,
    );
  }

  return order;
}

function normalizeToolkitOptions(value: true | AnnotationToolkitOptions): AnnotationToolkitOptions {
  const base = value === true ? {} : isPlainObject(value) ? value : {};
  const { ruler: _ruler, ...rest } = base;
  return {
    ...rest,
    destroyOnViewerClose: false,
  };
}

function shouldClearAnnotationsOnViewerClose(paperOverlays: PaperOverlaysOptions): boolean {
  if (paperOverlays.annotationToolkit === undefined) return false;
  return paperOverlays.clearAnnotationsOnViewerClose !== false;
}

function destroyConstructedOverlays(
  viewer: OSDPlus,
  constructedOverlays: readonly PaperOverlaysOrderItem[],
): void {
  for (const key of constructedOverlays.slice().reverse()) {
    if (key === 'screenshot') {
      (viewer.screenshotOverlay as unknown as { destroy?: () => void } | undefined)?.destroy?.();
    }
    if (key === 'fieldOfView') {
      (viewer.fieldOfViewOverlay as unknown as { destroy?: () => void } | undefined)?.destroy?.();
    }
    if (key === 'rotationControl') {
      destroyRotationControlOverlay(viewer.rotationControlOverlay);
    }
    if (key === 'annotationToolkit') {
      (viewer.annotationToolkit as unknown as { destroy?: () => void } | undefined)?.destroy?.();
    }
  }
  viewer.configurationWidget?.destroy();
  viewer.configurationWidget = undefined;
  viewer.annotationToolkit = undefined;
  viewer.screenshotOverlay = undefined;
  viewer.fieldOfViewOverlay = undefined;
  viewer.rotationControlOverlay = undefined;
}

function normalizeScreenshotOptions(value: true | ScreenshotOverlayOptions): ScreenshotOverlayOptions {
  return value === true ? {} : isPlainObject(value) ? value : {};
}

function normalizeFieldOfViewOptions(value: true | FieldOfViewOverlayOptions): FieldOfViewOverlayOptions {
  return value === true ? {} : isPlainObject(value) ? value : {};
}

function normalizeRotationControlOptions(
  value: true | RotationControlOverlayOptions,
): RotationControlOverlayOptions {
  return value === true ? {} : isPlainObject(value) ? value : {};
}

function normalizeConfigurationWidgetOptions(
  value: true | ConfigurationWidgetOptions,
): ConfigurationWidgetOptions {
  if (value === true) {
    return { attachAnnotationSection: true };
  }
  const o = isPlainObject(value) ? value : {};
  return {
    ...o,
    attachAnnotationSection: o.attachAnnotationSection !== false,
  };
}

function destroyRotationControlOverlay(overlay: RotationControlOverlay | undefined): void {
  const rot = overlay as unknown as {
    deactivate?: () => void;
    destroy?: () => void;
    overlay?: { destroy?: () => void };
  };
  rot?.deactivate?.();
  rot?.destroy?.();
  rot?.overlay?.destroy?.();
}

/**
 * OpenSeadragon viewer with osd-paperjs-annotation wired in. Pass OpenSeadragon options at the top
 * level; use `paperOverlays` to opt into specific overlays (never forwarded to OpenSeadragon).
 */
export class OSDPlus extends OpenSeadragon.Viewer {
  annotationToolkit?: AnnotationToolkit;
  configurationWidget?: ConfigurationWidget;
  screenshotOverlay?: ScreenshotOverlay;
  fieldOfViewOverlay?: FieldOfViewOverlay;
  rotationControlOverlay?: RotationControlOverlay;

  constructor(options: OSDPlusOptions) {
    const { paperOverlays, osdOptions } = splitOptions(options);
    super(withDefaultPrefixUrl(osdOptions) as OpenSeadragon.Options);
    if (!paperOverlays) return;

    let configurationWidgetOpts: ConfigurationWidgetOptions | undefined;
    if (paperOverlays.configurationWidget !== undefined) {
      configurationWidgetOpts = normalizeConfigurationWidgetOptions(paperOverlays.configurationWidget);
      this.configurationWidget = new ConfigurationWidget(this, {
        storageKey:
          configurationWidgetOpts.storageKey != null && configurationWidgetOpts.storageKey !== ''
            ? String(configurationWidgetOpts.storageKey)
            : undefined,
      });
    }

    const order = resolveOrder(paperOverlays);
    const constructedOverlays: PaperOverlaysOrderItem[] = [];
    for (const key of order) {
      if (key === 'annotationToolkit' && paperOverlays.annotationToolkit !== undefined) {
        const toolkitOpts = normalizeToolkitOptions(paperOverlays.annotationToolkit);
        this.annotationToolkit = new AnnotationToolkit(this, toolkitOpts);
        constructedOverlays.push('annotationToolkit');
        const rulerOpts = extractRulerOptions(paperOverlays.annotationToolkit);
        if (rulerOpts) {
          applyRulerToolkitOptions(this.annotationToolkit, rulerOpts);
          if (rulerOpts.syncPhysicalScaleFromTileSource) {
            installRulerPhysicalScaleSync(this, this.annotationToolkit, rulerOpts);
          }
        }
        if (
          this.configurationWidget &&
          configurationWidgetOpts?.attachAnnotationSection !== false
        ) {
          this.annotationToolkit.registerWithConfigurationWidget(this.configurationWidget);
        }
      }
      if (key === 'screenshot' && paperOverlays.screenshot !== undefined) {
        this.screenshotOverlay = new ScreenshotOverlay(
          this,
          normalizeScreenshotOptions(paperOverlays.screenshot),
        );
        constructedOverlays.push('screenshot');
      }
      if (key === 'fieldOfView' && paperOverlays.fieldOfView !== undefined) {
        this.fieldOfViewOverlay = new FieldOfViewOverlay(
          this,
          normalizeFieldOfViewOptions(paperOverlays.fieldOfView),
        );
        constructedOverlays.push('fieldOfView');
      }
      if (key === 'rotationControl' && paperOverlays.rotationControl !== undefined) {
        this.rotationControlOverlay = new RotationControlOverlay(
          this,
          normalizeRotationControlOptions(paperOverlays.rotationControl),
        );
        constructedOverlays.push('rotationControl');
      }
    }

    if (shouldClearAnnotationsOnViewerClose(paperOverlays)) {
      this.addHandler('close', () => {
        (this.annotationToolkit as unknown as { close?: () => void } | undefined)?.close?.();
      });
    }

    if (constructedOverlays.length > 0 || this.configurationWidget) {
      this.addOnceHandler('destroy', () => {
        destroyConstructedOverlays(this, constructedOverlays);
      });
    }

    installDrawerToggle(
      this,
      paperOverlays,
      osdOptions.drawer,
      this.configurationWidget,
      configurationWidgetOpts,
    );
  }
}
