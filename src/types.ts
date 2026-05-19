import type OpenSeadragon from 'openseadragon';

export type PaperOverlaysOrderItem =
  | 'annotationToolkit'
  | 'fieldOfView'
  | 'screenshot'
  | 'rotationControl';

/** OSDPlus `paperOverlays.annotationToolkit.ruler` options (applied after toolkit construction). */
export type RulerToolkitOptions = {
  /**
   * When true, sync ruler toolbar units from `tiledImage.source.mpp` (µm/px) on open, page change,
   * and tile-source ready. Requires osd-paperjs-annotation 0.7.2+ and ruler in the toolset.
   */
  syncPhysicalScaleFromTileSource?: boolean;
  /** Display unit derived from mpp.x when syncing. Default `'mm'`. */
  displayUnit?: 'mm' | 'um';
  /** Decimal places for ruler measurements. Default `2` upstream. */
  decimals?: number;
  /** `'round'` or `'truncate'`. Default `'round'` upstream. */
  roundingMode?: 'round' | 'truncate';
  /** Line width in screen pixels. */
  strokeWidthPixels?: number;
  /** Halo padding in screen pixels. */
  haloExtraPixels?: number;
  /** Label font size (6–72). */
  labelFontSize?: number;
  /**
   * Manual units-per-pixel (display units per paper unit). Overwritten on each mpp sync when
   * `syncPhysicalScaleFromTileSource` is true.
   */
  unitsPerPixel?: number;
  /**
   * Manual display unit label (e.g. `'mm'`, `'px'`). Overwritten on each mpp sync when
   * `syncPhysicalScaleFromTileSource` is true.
   */
  labelUnit?: string;
};

/** @deprecated Use `RulerToolkitOptions`. */
export type RulerPhysicalScaleOptions = RulerToolkitOptions;

export type AnnotationToolkitOptions = Record<string, unknown> & {
  ruler?: RulerToolkitOptions;
};
export type ScreenshotOverlayOptions = Record<string, unknown>;
export type FieldOfViewOverlayOptions = Record<string, unknown>;
export type RotationControlOverlayOptions = Record<string, unknown>;

export type DrawerToggleChoice = 'canvas' | 'webgl';

/**
 * Built-in Canvas / WebGL main-drawer toggle (OpenSeadragon 5 `requestDrawer`).
 * Opt-in via `enabled: true` on `paperOverlays.drawerToggle` or `configurationWidget.drawerToggle`.
 */
export type DrawerToggleOptions = {
  /** Default `false` for backward compatibility. */
  enabled?: boolean;
  defaultDrawer?: DrawerToggleChoice;
  /** Top-level field in the ConfigurationWidget localStorage JSON. Default `'drawer'`. */
  persistKey?: string;
  /** Gear dialog section heading. Default `'Rendering'`. */
  sectionLabel?: string;
  /** Drawer types offered in the select. Default `['canvas', 'webgl']`. */
  choices?: DrawerToggleChoice[];
  /** Persist choice when a storage key resolves. Default `true` when persistence is available. */
  persist?: boolean;
  /** Override storage; else `configurationWidget.storageKey`. */
  storageKey?: string;
};

/**
 * Options for osd-paperjs-annotation’s gear dialog. Constructed before other `paperOverlays` so
 * overlays can auto-register. Not part of `paperOverlays.order`.
 */
export type ConfigurationWidgetOptions = {
  /** Persist “Show button” toggles under this localStorage key; omit or null to disable. */
  storageKey?: string | null;
  /**
   * When true (default) and `annotationToolkit` is enabled, calls
   * `annotationToolkit.registerWithConfigurationWidget(configurationWidget)` after the toolkit exists.
   */
  attachAnnotationSection?: boolean;
  drawerToggle?: DrawerToggleOptions;
};

export type PaperOverlaysOptions = {
  /**
   * When `annotationToolkit` is enabled: on each viewer `close` (including before `open()`),
   * call upstream `AnnotationToolkit#close()` to clear annotations while keeping layout/UI.
   * Default `true`. Set `false` if the app clears or persists annotations itself.
   */
  clearAnnotationsOnViewerClose?: boolean;

  /** Optional overlay construction order override. Must be a permutation of enabled overlays. */
  order?: PaperOverlaysOrderItem[];

  /**
   * Opt-in to ConfigurationWidget (gear). Built first when present so other overlays register with it.
   * Not included in `order`.
   */
  configurationWidget?: true | ConfigurationWidgetOptions;

  /** Opt-in to AnnotationToolkit. `true` uses upstream defaults. */
  annotationToolkit?: true | AnnotationToolkitOptions;

  /** Opt-in to ScreenshotOverlay. `true` uses upstream defaults. */
  screenshot?: true | ScreenshotOverlayOptions;

  /** Opt-in to FieldOfViewOverlay. `true` uses upstream defaults. */
  fieldOfView?: true | FieldOfViewOverlayOptions;

  /** Opt-in to RotationControlOverlay. `true` uses upstream defaults. */
  rotationControl?: true | RotationControlOverlayOptions;

  /**
   * Canvas / WebGL drawer toggle without gear UI (apply + persist only). Merged with
   * `configurationWidget.drawerToggle` when both are set (nested options win for labels/choices).
   */
  drawerToggle?: DrawerToggleOptions;
};

export type OSDPlusOptions = OpenSeadragon.Options & {
  paperOverlays?: PaperOverlaysOptions;
};

export type GammaVibranceDrawerOptions = {
  gamma?: number;
  vibrance?: number;
};

/** Snapshot from `GammaVibranceWebGLDrawer#getGammaVibranceInstallStatus()` after the first-pass install attempt. */
export type GammaVibranceInstallStatus = {
  installed: boolean;
  /** Machine-readable outcome or failure stage. */
  reason: string;
  hasCm?: boolean;
  hasGl?: boolean;
  numTextures?: number;
  hasProgram?: boolean;
  hasUnitQuad?: boolean;
  /** Present when install threw. */
  error?: string;
};
