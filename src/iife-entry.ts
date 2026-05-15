import OpenSeadragon from 'openseadragon';
import { OSDPlus } from './osdplus';
import * as Annotation from 'osd-paperjs-annotation';
import { GammaVibranceWebGLDrawer } from './drawers/GammaVibranceWebGLDrawer';

/** IIFE global (`globalName` in tsup) must be the constructor; see `footer` in tsup.config.ts for interop unwrap. */
export default OSDPlus;

// Mirror osd-paperjs-annotation's UMD behavior: attach named exports to the global object.
// In a browser page, `globalThis` is `window`.
if (typeof globalThis !== 'undefined') {
  const g = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(Annotation)) {
    if (key === 'default' || key === '__esModule') continue;
    g[key] = value;
  }
  g.GammaVibranceWebGLDrawer = GammaVibranceWebGLDrawer;
  g.OpenSeadragon = OpenSeadragon;
}
