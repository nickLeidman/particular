import quadVertexShader from '../../commonShaders/quadVertexShader.glsl';
import type { Engine } from '../../engine/engine';
import downsampleBlurFragmentShader from './downsampleBlurFragmentShader.glsl';

export class DownsampleBlur {
  private program: WebGLProgram;
  private intermidiateFrameTexture: WebGLTexture;
  private intermidiateFrameBuffer: WebGLFramebuffer;

  constructor(private engine: Engine) {
    this.program = this.engine.createProgramFromShaders(quadVertexShader, downsampleBlurFragmentShader);

    this.intermidiateFrameTexture = this.engine.gl.createTexture();
    if (!this.intermidiateFrameTexture) {
      throw new Error('Failed to create texture buffer');
    }
    this.intermidiateFrameBuffer = this.engine.gl.createFramebuffer();
  }

  setTextureSize(size: { x: number; y: number }) {
    const gl = this.engine.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.intermidiateFrameTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, size.x, size.y, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  draw(inputTexture: WebGLTexture, outputTexture: WebGLTexture, outputFrameBuffer: WebGLFramebuffer) {
    const gl = this.engine.gl;

    gl.useProgram(this.program);

    this.setTextureSize({ x: this.engine.resolution.x / 10, y: this.engine.resolution.y / 10 });

    this.engine.attachRenderTarget(this.intermidiateFrameTexture, this.intermidiateFrameBuffer);

    //set viewport to half size
    this.engine.setViewport(0, 0, this.engine.resolution.x / 10, this.engine.resolution.y / 10);

    /* bind texture to be able to sample it in fragment shader */
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uTexture'), 0);

    this.engine.drawQuad();

    /* unbind texture */
    this.engine.resetViewport();

    // render output to screen
    this.engine.attachRenderTarget(outputTexture, outputFrameBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.intermidiateFrameTexture);
    gl.uniform1i(gl.getUniformLocation(this.program, 'uTexture'), 0);

    this.engine.drawQuad();
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
