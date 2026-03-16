import type { Engine } from '../../engine/engine';
import { QuadRenderer } from '../../textureRenderer/quadRenderer';
import simplexFragmentShader from './simplexFragmentShader.glsl';
import simplexVertexShader from './simplexVertexShader.glsl';

export interface SimplexNoiseOptions {
  /** Width of the noise texture. */
  width: number;
  /** Height of the noise texture. */
  height: number;
  /** Scale of the pattern (frequency). Higher = finer pattern. Default 1. */
  scale?: number;
  /** Period for tiling. 1 = one seamless tile over 0..1 UV. Default 1. */
  period?: number;
}

/**
 * Renders 2D tileable Simplex noise to a texture (red channel only).
 * Use the texture for continuous randomness (e.g. blending with particle position).
 */
export class SimplexNoise {
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly framebuffer: WebGLFramebuffer;
  private readonly quadRenderer: QuadRenderer;
  private readonly uScaleLoc: WebGLUniformLocation;
  private readonly uPeriodLoc: WebGLUniformLocation;

  private _width: number;
  private _height: number;
  private _scale: number;
  private _period: number;

  constructor(
    private readonly engine: Engine,
    options: SimplexNoiseOptions,
  ) {
    this._width = options.width;
    this._height = options.height;
    this._scale = options.scale ?? 1;
    this._period = options.period ?? 1;

    this.program = this.engine.createProgramFromShaders(simplexVertexShader, simplexFragmentShader);

    const uScaleLoc = this.engine.gl.getUniformLocation(this.program, 'uScale');
    const uPeriodLoc = this.engine.gl.getUniformLocation(this.program, 'uPeriod');
    if (!uScaleLoc || !uPeriodLoc) {
      throw new Error('SimplexNoise: missing uniform locations');
    }
    this.uScaleLoc = uScaleLoc;
    this.uPeriodLoc = uPeriodLoc;

    this.quadRenderer = new QuadRenderer(this.engine);

    this.texture = this.engine.gl.createTexture();
    if (!this.texture) {
      throw new Error('SimplexNoise: failed to create texture');
    }

    this.framebuffer = this.engine.gl.createFramebuffer();
    if (!this.framebuffer) {
      throw new Error('SimplexNoise: failed to create framebuffer');
    }
  }

  /** Renders noise into the texture and returns it. Texture is REPEAT and RGBA (red only for now). */
  render(): WebGLTexture {
    const gl = this.engine.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this._width, this._height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    this.engine.attachRenderTarget(this.texture, this.framebuffer);
    this.engine.setViewport(0, 0, this._width, this._height);
    this.engine.clear();

    gl.useProgram(this.program);
    gl.uniform1f(this.uScaleLoc, this._scale);
    gl.uniform1f(this.uPeriodLoc, this._period);
    this.engine.drawQuad();

    this.engine.resetViewport();
    this.engine.resetRenderTarget();

    return this.texture;
  }

  /**
   * Draw the current noise texture to the currently bound framebuffer (full-screen quad).
   * Call render() at least once first. Use with engine.attachOverlay(() => simplex.draw()) for preview.
   */
  draw(): void {
    this.quadRenderer.draw(this.texture);
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get scale(): number {
    return this._scale;
  }

  set scale(value: number) {
    this._scale = value;
  }

  get period(): number {
    return this._period;
  }

  set period(value: number) {
    this._period = value;
  }

  /** Last rendered texture. Call render() at least once before using. */
  getTexture(): WebGLTexture {
    return this.texture;
  }

  /** Change dimensions and re-allocate. Call render() after to update. */
  setDimensions(width: number, height: number): void {
    this._width = width;
    this._height = height;
  }
}
