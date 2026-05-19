declare module 'osd-paperjs-annotation' {
  /** Minimal typing until upstream ships .d.ts files. */
  export class AnnotationToolkit {
    constructor(viewer: unknown, opts?: Record<string, unknown>);
    registerWithConfigurationWidget(configurationWidget: ConfigurationWidget): void;
    getTool?(name: string): unknown;
    addTools?(toolNames?: string[]): void;
    destroy?(): void;
    close?(): void;
  }

  export class ScreenshotOverlay {
    constructor(viewer: unknown, opts?: Record<string, unknown>);
    destroy?(): void;
  }

  export class FieldOfViewOverlay {
    constructor(viewer: unknown, opts?: Record<string, unknown>);
    destroy?(): void;
  }

  export class PaperOverlay {
    constructor(viewer: unknown, opts?: Record<string, unknown>);
    destroy?(): void;
  }

  export class RotationControlOverlay {
    constructor(viewer: unknown, opts?: Record<string, unknown>);
    destroy?(): void;
  }

  export const ANNOTATION_TOOLBAR_PERSIST_ID_PENCIL: string;
  export const ANNOTATION_TOOLBAR_PERSIST_ID_FILE: string;

  export class ConfigurationWidget {
    constructor(viewer: unknown, widgetOpts?: { storageKey?: string | null });
    viewer: unknown;
    addSection(label: string, element: HTMLElement): HTMLElement;
    removeSection(element: HTMLElement): void;
    register(overlay: unknown, opts?: Record<string, unknown>): void;
    unregister(overlay: unknown): void;
    open(): void;
    close(): void;
    destroy(): void;
    persistToolbarVisibilityEnabled(): boolean;
    getPersistedToolbarVisibility(overlayKey: string): boolean | undefined;
    setPersistedToolbarVisibility(overlayKey: string, visible: boolean): void;
    clearPersistedOverlayToolbarState(): void;
  }

  export function attachAnnotationToolkitConfigurationWidget(
    annotationToolkit: AnnotationToolkit,
    configurationWidget: ConfigurationWidget,
  ): HTMLElement | null;

  export function mppFromTiledImage(
    tiledImage: unknown,
  ): { x: number; y: number } | null;

  export function mppFromActiveViewerImage(
    viewer: unknown,
  ): { x: number; y: number } | null;

  export function applyRulerPhysicalScaleFromMpp(
    toolkit: AnnotationToolkit,
    mpp: { x: number; y: number } | null,
    options?: { unit?: 'mm' | 'um' },
  ): boolean;

  export const OSDPaperjsAnnotation: Record<string, unknown>;
}
