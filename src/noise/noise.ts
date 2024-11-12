import type { Engine } from '../engine/engine';
import noiseFragmentShader from './noiseFragmentShader.glsl';
import noiseVertexShader from './noiseVertexShader.glsl';

export class Noise {
  private gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;

  constructor(
    private readonly engine: Engine,
    private resolution: number,
  ) {
    this.gl = engine.gl;
    const vertexShader = this.engine.createShader(this.gl.VERTEX_SHADER, noiseVertexShader);
    const fragmentShader = this.engine.createShader(this.gl.FRAGMENT_SHADER, noiseFragmentShader);
    const program = this.engine.createProgramFromShaders(vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create noise program');
    }

    this.program = program;
  }

  render() {
    const gl = this.engine.gl;
    const resolution = this.resolution;

    const textureBuffer = gl.createTexture();
    if (!textureBuffer) {
      throw new Error('Failed to create texture buffer');
    }
    gl.bindTexture(gl.TEXTURE_2D, textureBuffer);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, resolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureBuffer, 0);

    gl.viewport(0, 0, resolution, resolution);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this.engine.resetViewport();
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return textureBuffer;
  }
}
