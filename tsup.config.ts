import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'esbuild';
import { defineConfig } from 'tsup';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version?: string;
};

/** Verbatim browser preamble: OpenSeadragon UMD then osd-paperjs-annotation UMD (must run before the slim IIFE reads globalThis). */
function readIifeBrowserPreamble(): string {
  const osdPath = join(rootDir, 'node_modules/openseadragon/build/openseadragon/openseadragon.js');
  const opaPath = join(rootDir, 'node_modules/osd-paperjs-annotation/dist/main.js');
  return `${readFileSync(osdPath, 'utf8')}\n${readFileSync(opaPath, 'utf8')}\n`;
}

/** Named exports from osd-paperjs-annotation v0.7.1 `osdpaperjsannotation.mjs` (must match UMD keys on globalThis). */
const OPA_GLOBAL_EXPORTS = [
  'ANNOTATION_TOOLBAR_PERSIST_ID_FILE',
  'ANNOTATION_TOOLBAR_PERSIST_ID_PENCIL',
  'AnnotationLayout',
  'AnnotationToolbar',
  'AnnotationToolkit',
  'AnnotationUITool',
  'applyRulerPhysicalScaleFromMpp',
  'attachAnnotationToolkitConfigurationWidget',
  'mppFromActiveViewerImage',
  'mppFromTiledImage',
  'BrushTool',
  'ConfigurationWidget',
  'DefaultTool',
  'EllipseTool',
  'FeatureCollectionUI',
  'FeatureUI',
  'FieldOfViewOverlay',
  'FileDialog',
  'LayerUI',
  'LinestringTool',
  'OSDPaperjsAnnotation',
  'PaperOffset',
  'PaperOverlay',
  'PointTextTool',
  'PointTool',
  'PolygonTool',
  'RasterTool',
  'RectangleTool',
  'RotationControlOverlay',
  'RulerTool',
  'ScreenshotOverlay',
  'SelectTool',
  'StyleTool',
  'ToolBase',
  'TransformTool',
  'ViewerOverlayBase',
  'WandTool',
] as const;

/**
 * Slim IIFE tail: do not parse osd-paperjs-annotation or OpenSeadragon — preamble already defined globals;
 * this graph reads from globalThis via virtual modules.
 */
function iifeGlobalsShimPlugin(): Plugin {
  const opaBody = OPA_GLOBAL_EXPORTS.map(
    (name) => `export const ${name} = __osdplusOpaGlobal(${JSON.stringify(name)});`,
  ).join('\n');

  return {
    name: 'osdplus-iife-globals-shim',
    setup(build) {
      build.onResolve({ filter: /^openseadragon$/ }, () => ({
        path: 'virtual:osdplus-openseadragon',
        namespace: 'osdplus-shim',
      }));
      build.onResolve({ filter: /^osd-paperjs-annotation$/ }, () => ({
        path: 'virtual:osdplus-opa',
        namespace: 'osdplus-shim',
      }));
      build.onLoad({ filter: /.*/, namespace: 'osdplus-shim' }, (args) => {
        if (args.path === 'virtual:osdplus-openseadragon') {
          return {
            contents: `const g = typeof globalThis !== "undefined" ? globalThis : {};
const OSD = g.OpenSeadragon;
if (typeof OSD !== "function") {
  throw new Error("[osdplus] OpenSeadragon missing on globalThis. Use dist/osdplus.min.js (includes OpenSeadragon + OPA preamble) or load OpenSeadragon before the slim IIFE.");
}
export default OSD;
`,
            loader: 'js',
          };
        }
        if (args.path === 'virtual:osdplus-opa') {
          return {
            contents: `const g = typeof globalThis !== "undefined" ? globalThis : {};
function __osdplusOpaGlobal(name) {
  const v = g[name];
  if (v === undefined) {
    throw new Error("[osdplus] osd-paperjs-annotation globals missing. Use dist/osdplus.min.js (includes verbatim vendor preamble) or load /dist/osd-paperjs-annotation.vendor.js after OpenSeadragon. Missing: " + name);
  }
  return v;
}
${opaBody}
`,
            loader: 'js',
          };
        }
        return null;
      });
    },
  };
}

const iifePreamble = readIifeBrowserPreamble();

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'browser',
    target: 'es2020',
    outDir: 'dist',
    external: ['openseadragon', 'osd-paperjs-annotation'],
  },
  {
    entry: { 'osdplus.min': 'src/iife-entry.ts' },
    format: ['iife'],
    globalName: 'OSDPlus',
    minify: false,
    sourcemap: false,
    treeshake: false,
    platform: 'browser',
    target: 'es2020',
    outDir: 'dist',
    outExtension() {
      return { js: '.js' };
    },
    external: ['openseadragon', 'osd-paperjs-annotation'],
    esbuildPlugins: [iifeGlobalsShimPlugin()],
    banner: {
      js: `/*! osdplus v${pkg.version ?? '0.0.0'} | MIT | https://github.com/pearcetm/OSDPlus | IIFE preamble: OpenSeadragon + osd-paperjs-annotation (verbatim) */\n${iifePreamble}`,
    },
    footer: {
      js: `;(function(){var _o=typeof OSDPlus!=="undefined"?OSDPlus:null;if(_o&&_o.__esModule){if(typeof _o.default==="function")OSDPlus=_o.default;else if(typeof _o.OSDPlus==="function")OSDPlus=_o.OSDPlus;}})();`,
    },
  },
]);
