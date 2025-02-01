import type { Engine } from '../engine/engine';
import noiseFragmentShader from './noiseFragmentShader.glsl';
import noiseVertexShader from './noiseVertexShader.glsl';

export class Noise {
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly framebuffer: WebGLFramebuffer;

  constructor(
    private readonly engine: Engine,
    private resolution: number,
  ) {
    this.program = this.engine.createProgramFromShaders(noiseVertexShader, noiseFragmentShader);

    this.texture = this.engine.gl.createTexture();
    if (!this.texture) {
      throw new Error('Failed to create texture buffer');
    }

    this.framebuffer = this.engine.gl.createFramebuffer();
  }

  render() {
    const gl = this.engine.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.resolution, this.resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    this.engine.attachRenderTarget(this.texture, this.framebuffer);

    this.engine.setViewport(0, 0, this.resolution, this.resolution);
    this.engine.clear();

    gl.useProgram(this.program);
    this.engine.drawQuad();

    this.engine.resetViewport();
    this.engine.resetRenderTarget();

    return this.texture;
  }
}
