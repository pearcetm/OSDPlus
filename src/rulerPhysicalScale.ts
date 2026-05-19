import type OpenSeadragon from 'openseadragon';
import {
  applyRulerPhysicalScaleFromMpp,
  mppFromActiveViewerImage,
  type AnnotationToolkit,
} from 'osd-paperjs-annotation';
import type { RulerToolkitOptions } from './types';

type TileSourceLike = {
  ready?: boolean;
  mpp?: { x?: unknown; y?: unknown };
  addHandler?: (event: string, handler: () => void) => void;
  addOnceHandler?: (event: string, handler: () => void) => void;
};

type TiledImageLike = {
  source?: TileSourceLike;
};

type WorldLike = {
  getItemCount?: () => number;
  getItemAt?: (index: number) => TiledImageLike;
  addHandler?: (event: string, handler: (ev: { item?: TiledImageLike }) => void) => void;
};

type ViewerWithWorld = OpenSeadragon.Viewer & {
  world?: WorldLike;
};

type RulerToolbarControlLike = {
  labelUnit?: string;
  unitsPerPixel?: number;
  unitsInput?: HTMLInputElement;
  unitsPerPixelInput?: HTMLInputElement;
  updateMeasurement?: (p1: unknown, p2: unknown, distance: unknown) => void;
};

type RulerToolLike = {
  setDecimals?: (n: number) => void;
  setRoundingMode?: (mode: string) => void;
  setStrokeWidthPixels?: (n: number) => void;
  setHaloExtraPixels?: (n: number) => void;
  setLabelFontSize?: (n: number) => void;
  getToolbarControl?: () => RulerToolbarControlLike;
  refreshSegmentLabels?: () => void;
  _lastMeasurement?: { p1?: unknown; p2?: unknown; distance?: number | null };
};

type AnnotationToolkitWithTools = AnnotationToolkit & {
  getTool?: (name: string) => RulerToolLike | null;
  addTools?: (toolNames?: string[]) => void;
};

function isPlainRulerObject(value: unknown): value is RulerToolkitOptions {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRulerTool(toolkit: AnnotationToolkit): RulerToolLike | null {
  const tk = toolkit as AnnotationToolkitWithTools;
  let ruler = tk.getTool?.('ruler') ?? null;
  if (!ruler && tk.addTools) {
    tk.addTools();
    ruler = tk.getTool?.('ruler') ?? null;
  }
  return ruler;
}

export function extractRulerOptions(
  toolkitOpts: true | Record<string, unknown> | undefined,
): RulerToolkitOptions | undefined {
  if (toolkitOpts === undefined || toolkitOpts === true) return undefined;
  const ruler = toolkitOpts.ruler;
  if (!isPlainRulerObject(ruler)) return undefined;
  return ruler;
}

export function extractRulerSyncOptions(
  toolkitOpts: true | Record<string, unknown> | undefined,
): RulerToolkitOptions | undefined {
  const o = extractRulerOptions(toolkitOpts);
  if (!o || o.syncPhysicalScaleFromTileSource !== true) return undefined;
  return o;
}

/**
 * Apply `annotationToolkit.ruler` display options to the upstream ruler tool.
 * Requires ruler in the toolset (default toolset includes it).
 */
export function applyRulerToolkitOptions(
  toolkit: AnnotationToolkit,
  opts: RulerToolkitOptions,
): boolean {
  const ruler = getRulerTool(toolkit);
  if (!ruler) return false;

  if (opts.decimals != null && Number.isFinite(opts.decimals)) {
    ruler.setDecimals?.(opts.decimals);
  }
  if (opts.roundingMode != null) {
    ruler.setRoundingMode?.(opts.roundingMode);
  }
  if (opts.strokeWidthPixels != null && Number.isFinite(opts.strokeWidthPixels)) {
    ruler.setStrokeWidthPixels?.(opts.strokeWidthPixels);
  }
  if (opts.haloExtraPixels != null && Number.isFinite(opts.haloExtraPixels)) {
    ruler.setHaloExtraPixels?.(opts.haloExtraPixels);
  }
  if (opts.labelFontSize != null && Number.isFinite(opts.labelFontSize)) {
    ruler.setLabelFontSize?.(opts.labelFontSize);
  }

  const tc = ruler.getToolbarControl?.();
  if (tc) {
    if (opts.labelUnit != null && String(opts.labelUnit).trim() !== '') {
      tc.labelUnit = String(opts.labelUnit).trim();
      if (tc.unitsInput) tc.unitsInput.value = tc.labelUnit;
    }
    if (
      opts.unitsPerPixel != null &&
      Number.isFinite(opts.unitsPerPixel) &&
      opts.unitsPerPixel > 0
    ) {
      tc.unitsPerPixel = opts.unitsPerPixel;
      if (tc.unitsPerPixelInput) tc.unitsPerPixelInput.value = String(opts.unitsPerPixel);
    }
    if (opts.labelUnit != null || opts.unitsPerPixel != null) {
      const lm = ruler._lastMeasurement;
      tc.updateMeasurement?.(lm?.p1 ?? null, lm?.p2 ?? null, lm?.distance ?? null);
      ruler.refreshSegmentLabels?.();
    }
  }

  return true;
}

function bindSourceReady(tiledImage: TiledImageLike | undefined, onReady: () => void): void {
  const source = tiledImage?.source;
  if (!source?.addHandler && !source?.addOnceHandler) return;
  const run = () => onReady();
  if (source.ready) {
    run();
    return;
  }
  if (source.addOnceHandler) {
    source.addOnceHandler('ready', run);
  } else {
    source.addHandler?.('ready', run);
  }
}

function trySyncRulerFromViewer(
  viewer: ViewerWithWorld,
  toolkit: AnnotationToolkit,
  opts: RulerToolkitOptions,
): void {
  const mpp = mppFromActiveViewerImage(viewer as unknown as Parameters<typeof mppFromActiveViewerImage>[0]);
  if (!mpp) return;
  applyRulerPhysicalScaleFromMpp(
    toolkit as unknown as Parameters<typeof applyRulerPhysicalScaleFromMpp>[0],
    mpp,
    { unit: opts.displayUnit ?? 'mm' },
  );
}

function bindActiveItemSourceReady(viewer: ViewerWithWorld, onReady: () => void): void {
  const world = viewer.world;
  if (!world?.getItemCount || world.getItemCount() !== 1) return;
  bindSourceReady(world.getItemAt?.(0) as TiledImageLike | undefined, onReady);
}

export function installRulerPhysicalScaleSync(
  viewer: OpenSeadragon.Viewer,
  toolkit: AnnotationToolkit,
  opts: RulerToolkitOptions,
): void {
  const v = viewer as ViewerWithWorld;
  const sync = () => trySyncRulerFromViewer(v, toolkit, opts);

  viewer.addHandler('open', sync);
  viewer.addHandler('page', sync);

  const world = v.world;
  if (world?.addHandler) {
    world.addHandler('add-item', (ev: { item?: unknown }) => {
      if (world.getItemCount?.() !== 1) return;
      bindSourceReady(ev.item as TiledImageLike | undefined, sync);
      sync();
    });
  }

  bindActiveItemSourceReady(v, sync);
  sync();
}
