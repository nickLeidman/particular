import qadVertexShader from '../commonShaders/quadVertexShader.glsl';
import type { Engine } from '../engine/engine';
import blurFragmentShader from './blurFragmentShader.glsl';
import highPassFragmentShader from './highPassFragmentShader.glsl';

export class TextureRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;

  constructor(
    readonly engine: Engine,
    shader: string,
  ) {
    this.gl = engine.gl;
    this.program = this.engine.createProgramFromShaders(qadVertexShader, shader);
  }

  draw(texture: WebGLTexture) {
    const gl = this.engine.gl;

    gl.useProgram(this.program);

    /* bind texture to be able to sample it in fragment shader */
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uTexture'), 0);

    this.preDraw();

    this.engine.drawQuad();

    /* unbind texture */
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  preDraw(): void {
    // to be overridden
  }
}

export class HighPassShader extends TextureRenderer {
  private readonly highPassThreshold: number;

  constructor(engine: Engine, { highPassThreshold }: { highPassThreshold: number }) {
    super(engine, highPassFragmentShader);
    this.highPassThreshold = highPassThreshold;
  }

  preDraw() {
    const gl = this.engine.gl;

    /* attach afloat uniform with high pass threshold */
    gl.uniform1f(gl.getUniformLocation(this.program, 'uHighPassThreshold'), this.highPassThreshold);
  }
}

export class GaussianBlurShader extends TextureRenderer {
  private radius: number;
  constructor(engine: Engine, { radius }: { radius: number }) {
    super(engine, blurFragmentShader);
    this.radius = radius;
  }

  preDraw() {
    const gl = this.engine.gl;

    /* attach afloat uniform with blur radius */
    gl.uniform1f(gl.getUniformLocation(this.program, 'uBlurRadius'), this.radius);
  }
}
