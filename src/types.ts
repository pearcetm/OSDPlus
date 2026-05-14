import type OpenSeadragon from 'openseadragon';

export type PaperOverlaysOrderItem =
  | 'annotationToolkit'
  | 'fieldOfView'
  | 'screenshot'
  | 'rotationControl';

export type AnnotationToolkitOptions = Record<string, unknown>;
export type ScreenshotOverlayOptions = Record<string, unknown>;
export type FieldOfViewOverlayOptions = Record<string, unknown>;
export type RotationControlOverlayOptions = Record<string, unknown>;

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
};

export type PaperOverlaysOptions = {
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
