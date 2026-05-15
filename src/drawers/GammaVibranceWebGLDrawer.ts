import OpenSeadragon from 'openseadragon';
import type { GammaVibranceInstallStatus } from '../types';

type DrawerCtorOptions = {
  viewer: OpenSeadragon.Viewer;
  viewport: OpenSeadragon.Viewport;
  element: Element;
  debugGridColor?: number;
  unpackWithPremultipliedAlpha?: boolean;
  gamma?: number;
  vibrance?: number;
};

/**
 * Minimal surface of OpenSeadragon’s internal WebglContextManager (OSD 6+; not exported by typings).
 * OSD 5.x stores `_gl`, `_firstPass`, and `_unitQuad` on the drawer instead.
 */
interface OsdWebglContextManagerLike {
  getContext?: () => WebGLRenderingContext | WebGL2RenderingContext | null;
  getFirstPass?: () => OsdStockFirstPass | undefined;
  getUnitQuad?: () => Float32Array | undefined;
  _firstPass?: OsdStockFirstPass;
  _unitQuad?: Float32Array;
  _initShaderProgram?: (
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string,
  ) => WebGLProgram | null;
}

interface OsdStockFirstPass {
  shaderProgram?: WebGLProgram;
  aOutputPosition?: number;
  aTexturePosition?: number;
  aIndex?: number;
  uGamma?: WebGLUniformLocation | null;
  uVibrance?: WebGLUniformLocation | null;
  uImages?: WebGLUniformLocation | null;
  bufferOutputPosition?: WebGLBuffer | null;
  bufferTexturePosition?: WebGLBuffer | null;
  bufferIndex?: WebGLBuffer | null;
}

/** Runtime fields on {@link OpenSeadragon.WebGLDrawer} (OSD 5.x layout; partial). */
type WebGLDrawerInternals = {
  viewer: OpenSeadragon.Viewer;
  _gl?: WebGLRenderingContext | WebGL2RenderingContext | null;
  _firstPass?: OsdStockFirstPass;
  _unitQuad?: Float32Array;
  _glContext?: OsdWebglContextManagerLike | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textureIndices(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

function buildFirstPassVertexShader(numTextures: number): string {
  const matrixUniforms = textureIndices(numTextures)
    .map((i) => `uniform mat3 u_matrix_${i};`)
    .join('\n');
  const conditionals = textureIndices(numTextures)
    .map(
      (i, idx) =>
        `${idx > 0 ? 'else ' : ''}if(int(a_index) == ${i}) { transform_matrix = u_matrix_${i}; }`,
    )
    .join('\n');

  return `
      attribute vec2 a_output_position;
      attribute vec2 a_texture_position;
      attribute float a_index;

      ${matrixUniforms}

      varying vec2 v_texture_position;
      varying float v_image_index;

      void main() {
          mat3 transform_matrix;
          ${conditionals}
          gl_Position = vec4(transform_matrix * vec3(a_output_position, 1), 1);
          v_texture_position = a_texture_position;
          v_image_index = a_index;
      }
    `;
}

function buildFirstPassFragmentShader(numTextures: number): string {
  return `
      precision mediump float;

      uniform sampler2D u_images[${numTextures}];
      uniform float u_opacities[${numTextures}];

      uniform float u_gamma;
      uniform float u_vibrance;

      varying vec2 v_texture_position;
      varying float v_image_index;

      float luma(vec3 c) {
          return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      vec3 applyGamma(vec3 c, float gamma) {
          float g = max(gamma, 0.0001);
          return pow(clamp(c, 0.0, 1.0), vec3(1.0 / g));
      }

      vec3 applyVibrance(vec3 c, float vibrance) {
          float lum = luma(c);
          vec3 gray = vec3(lum);
          vec3 diff = c - gray;

          float mx = max(max(c.r, c.g), c.b);
          float mn = min(min(c.r, c.g), c.b);
          float sat = (mx - mn);

          float muted = 1.0 - clamp(sat, 0.0, 1.0);
          float amount = vibrance * muted;

          return clamp(gray + diff * (1.0 + amount), 0.0, 1.0);
      }

      void main() {
          for(int i = 0; i < ${numTextures}; ++i){
              if(i == int(v_image_index)){
                  vec4 col = texture2D(u_images[i], v_texture_position);
                  vec3 rgb = applyVibrance(col.rgb, u_vibrance);
                  rgb = applyGamma(rgb, u_gamma);
                  gl_FragColor = vec4(rgb, col.a) * u_opacities[i];
              }
          }
      }
    `;
}

/**
 * WebGL drawer that applies gamma + vibrance in the first-pass fragment shader.
 *
 * Note: This intentionally targets “close enough” appearance adjustments (not color managed).
 */
export class GammaVibranceWebGLDrawer extends OpenSeadragon.WebGLDrawer {
  /**
   * ES/build-tool safe hook into stock {@link OpenSeadragon.WebGLDrawer#_setupRenderer} (cannot use `super._setupRenderer()` here).
   */
  private static readonly _stockSetupRenderer = (
    OpenSeadragon.WebGLDrawer.prototype as unknown as { _setupRenderer?: () => void }
  )._setupRenderer;

  /**
   * No field initializers here: they run after `super()` returns and would overwrite install state set inside
   * `WebGLDrawer`'s constructor (`_setupRenderer` → `_installGammaVibranceFirstPassProgram`).
   */
  private _gamma!: number;
  private _vibrance!: number;
  private _uGammaFirstPass!: WebGLUniformLocation | null;
  private _uVibranceFirstPass!: WebGLUniformLocation | null;
  private _installedFirstPassProgram!: boolean;
  private _installStatus!: GammaVibranceInstallStatus;

  constructor(options: DrawerCtorOptions) {
    super(options as any);
    this._gamma = this._normalizeGamma(options.gamma);
    this._vibrance = this._normalizeVibrance(options.vibrance);
    // `super()` already ran `_setupRenderer` (while `this._gamma`/`this._vibrance` were still uninitialized).
    // Re-run patch + uniforms now that drawerOptions-derived values are set.
    this._installGammaVibranceFirstPassProgram();
    this._applyUniforms();
  }

  /** Structured outcome of the last first-pass patch attempt (runs during `_setupRenderer`). */
  getGammaVibranceInstallStatus(): GammaVibranceInstallStatus {
    return { ...this._installStatus };
  }

  getGamma(): number {
    return this._gamma;
  }

  getVibrance(): number {
    return this._vibrance;
  }

  setGamma(gamma: number): void {
    this.setGammaVibrance({ gamma });
  }

  setVibrance(vibrance: number): void {
    this.setGammaVibrance({ vibrance });
  }

  setGammaVibrance(values: { gamma?: number; vibrance?: number }): void {
    if (values.gamma !== undefined) this._gamma = this._normalizeGamma(values.gamma);
    if (values.vibrance !== undefined) this._vibrance = this._normalizeVibrance(values.vibrance);
    this._applyUniforms();
    this._internals().viewer.forceRedraw?.();
  }

  // `_recreateContext` calls `_setupRenderer()` again, which re-runs this hook.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _setupRenderer(): void {
    GammaVibranceWebGLDrawer._stockSetupRenderer?.call(this);
    this._installGammaVibranceFirstPassProgram();
    this._applyUniforms();
  }

  private _internals(): WebGLDrawerInternals {
    return this as unknown as WebGLDrawerInternals;
  }

  private _contextManager(): OsdWebglContextManagerLike | null {
    const internal = this._internals();
    if (internal._glContext) {
      return internal._glContext;
    }
    const gl = internal._gl;
    if (!gl) {
      return null;
    }
    return {
      getContext: () => gl,
      getFirstPass: () => internal._firstPass,
      get _firstPass() {
        return internal._firstPass;
      },
      set _firstPass(value: OsdStockFirstPass | undefined) {
        internal._firstPass = value;
      },
      getUnitQuad: () => internal._unitQuad,
      get _unitQuad() {
        return internal._unitQuad;
      },
      _initShaderProgram: (
        OpenSeadragon.WebGLDrawer as unknown as {
          initShaderProgram: NonNullable<OsdWebglContextManagerLike['_initShaderProgram']>;
        }
      ).initShaderProgram,
    };
  }

  private _setInstallFailed(status: Omit<GammaVibranceInstallStatus, 'installed'> & { reason: string }): void {
    this._installedFirstPassProgram = false;
    this._uGammaFirstPass = null;
    this._uVibranceFirstPass = null;
    this._installStatus = { installed: false, ...status };
  }

  private _installGammaVibranceFirstPassProgram(): void {
    this._installedFirstPassProgram = false;
    this._uGammaFirstPass = null;
    this._uVibranceFirstPass = null;
    this._installStatus = { installed: false, reason: 'in_progress' };

    const cm = this._contextManager();
    if (!cm) {
      this._setInstallFailed({ reason: 'no_context_manager', hasCm: false });
      return;
    }

    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    let numTextures = 0;

    try {
      gl = cm.getContext?.() ?? null;
      if (!gl) {
        this._setInstallFailed({ reason: 'no_gl_context', hasCm: true, hasGl: false });
        return;
      }

      const glCtx = gl;
      numTextures = glCtx.getParameter(glCtx.MAX_TEXTURE_IMAGE_UNITS);
      if (!numTextures || numTextures <= 0) {
        this._setInstallFailed({
          reason: 'invalid_max_texture_image_units',
          hasCm: true,
          hasGl: true,
          numTextures: numTextures ?? undefined,
        });
        return;
      }

      const vertexShaderProgram = buildFirstPassVertexShader(numTextures);
      const fragmentShaderProgram = buildFirstPassFragmentShader(numTextures);

      const initShaderProgram =
        cm._initShaderProgram ??
        (
          this.constructor as typeof OpenSeadragon.WebGLDrawer & {
            initShaderProgram?: OsdWebglContextManagerLike['_initShaderProgram'];
          }
        ).initShaderProgram;

      const program = initShaderProgram?.(glCtx, vertexShaderProgram, fragmentShaderProgram) ?? null;

      if (!program) {
        this._setInstallFailed({
          reason: 'program_null',
          hasCm: true,
          hasGl: true,
          numTextures,
          hasProgram: false,
        });
        return;
      }

      const firstPassExisting: OsdStockFirstPass | undefined = cm.getFirstPass?.() ?? cm._firstPass;
      const unitQuad: Float32Array | undefined = cm.getUnitQuad?.() ?? cm._unitQuad;

      if (!unitQuad || !(unitQuad instanceof Float32Array) || unitQuad.length < 12) {
        this._setInstallFailed({
          reason: 'missing_unit_quad',
          hasCm: true,
          hasGl: true,
          numTextures,
          hasProgram: true,
          hasUnitQuad: false,
        });
        glCtx.deleteProgram(program);
        return;
      }

      glCtx.useProgram(program);

      const firstPass = {
        shaderProgram: program,
        aOutputPosition: glCtx.getAttribLocation(program, 'a_output_position'),
        aTexturePosition: glCtx.getAttribLocation(program, 'a_texture_position'),
        aIndex: glCtx.getAttribLocation(program, 'a_index'),
        uTransformMatrices: textureIndices(numTextures).map((i) =>
          glCtx.getUniformLocation(program, `u_matrix_${i}`),
        ),
        uImages: glCtx.getUniformLocation(program, 'u_images'),
        uOpacities: glCtx.getUniformLocation(program, 'u_opacities'),
        uGamma: glCtx.getUniformLocation(program, 'u_gamma'),
        uVibrance: glCtx.getUniformLocation(program, 'u_vibrance'),
        bufferOutputPosition: firstPassExisting?.bufferOutputPosition ?? glCtx.createBuffer(),
        bufferTexturePosition: firstPassExisting?.bufferTexturePosition ?? glCtx.createBuffer(),
        bufferIndex: firstPassExisting?.bufferIndex ?? glCtx.createBuffer(),
      };

      if (firstPass.aOutputPosition < 0 || firstPass.aTexturePosition < 0 || firstPass.aIndex < 0) {
        this._setInstallFailed({
          reason: 'invalid_attrib_locations',
          hasCm: true,
          hasGl: true,
          numTextures,
          hasProgram: true,
          hasUnitQuad: true,
        });
        glCtx.deleteProgram(program);
        return;
      }

      if (firstPass.uGamma == null || firstPass.uVibrance == null) {
        this._setInstallFailed({
          reason: 'inactive_gamma_vibrance_uniforms',
          hasCm: true,
          hasGl: true,
          numTextures,
          hasProgram: true,
          hasUnitQuad: true,
        });
        glCtx.deleteProgram(program);
        return;
      }

      const previousProgram = firstPassExisting?.shaderProgram;
      if (previousProgram && previousProgram !== program) {
        glCtx.deleteProgram(previousProgram);
      }

      cm._firstPass = firstPass;

      if (firstPass.uImages != null) {
        glCtx.uniform1iv(firstPass.uImages, textureIndices(numTextures));
      }

      const outputQuads = new Float32Array(numTextures * 12);
      for (let i = 0; i < numTextures; ++i) {
        outputQuads.set(unitQuad, i * 12);
      }
      glCtx.bindBuffer(glCtx.ARRAY_BUFFER, firstPass.bufferOutputPosition);
      glCtx.bufferData(glCtx.ARRAY_BUFFER, outputQuads, glCtx.STATIC_DRAW);
      glCtx.enableVertexAttribArray(firstPass.aOutputPosition);

      glCtx.bindBuffer(glCtx.ARRAY_BUFFER, firstPass.bufferTexturePosition);
      glCtx.enableVertexAttribArray(firstPass.aTexturePosition);

      glCtx.bindBuffer(glCtx.ARRAY_BUFFER, firstPass.bufferIndex);
      const indices = textureIndices(numTextures)
        .map((i) => Array(6).fill(i))
        .flat();
      glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array(indices), glCtx.STATIC_DRAW);
      glCtx.enableVertexAttribArray(firstPass.aIndex);

      this._uGammaFirstPass = firstPass.uGamma;
      this._uVibranceFirstPass = firstPass.uVibrance;

      glCtx.useProgram(program);
      glCtx.uniform1f(firstPass.uGamma, this._gamma);
      glCtx.uniform1f(firstPass.uVibrance, this._vibrance);

      this._installedFirstPassProgram = true;
      this._installStatus = {
        installed: true,
        reason: 'ok',
        hasCm: true,
        hasGl: true,
        numTextures,
        hasProgram: true,
        hasUnitQuad: true,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this._setInstallFailed({
        reason: 'exception',
        hasCm: !!cm,
        hasGl: !!gl,
        numTextures: numTextures || undefined,
        error: message,
      });
    }
  }

  private _normalizeGamma(gamma: number | undefined): number {
    if (gamma === undefined || !Number.isFinite(gamma)) return 1;
    return clamp(gamma, 0.05, 8);
  }

  private _normalizeVibrance(vibrance: number | undefined): number {
    if (vibrance === undefined || !Number.isFinite(vibrance)) return 0;
    return clamp(vibrance, -1, 1);
  }

  private _applyUniforms(): void {
    if (!this._installedFirstPassProgram) return;

    const cm = this._contextManager();
    const gl = cm?.getContext?.() ?? null;
    const firstPass = cm?.getFirstPass?.() ?? cm?._firstPass;
    if (!gl || !firstPass?.shaderProgram) return;

    gl.useProgram(firstPass.shaderProgram);
    if (this._uGammaFirstPass != null) gl.uniform1f(this._uGammaFirstPass, this._gamma);
    if (this._uVibranceFirstPass != null) gl.uniform1f(this._uVibranceFirstPass, this._vibrance);
  }
}
