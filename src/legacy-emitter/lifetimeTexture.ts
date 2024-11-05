import type { Engine } from '../engine/engine';
import lifetimeTextureFragmentShader from './lifetimeTextureFragmentShader.glsl';
import lifetimeTextureVertexShader from './lifetimeTextureVertexShader.glsl';

export class LifetimeTexture {
  private gl: WebGLRenderingContext;
  private currentTexture: WebGLTexture;
  private targetTexture: WebGLTexture;
  private currentFBO: WebGLFramebuffer;
  private targetFBO: WebGLFramebuffer;
  private width: number;
  private height: number;
  private quad: WebGLBuffer;
  private updateProgram: WebGLProgram;

  constructor(engine: Engine, count: number) {
    this.gl = engine.gl;
    this.width = count;
    this.height = 1;

    // Ensure necessary extensions are available
    // const extFloat = this.gl.getExtension('OES_texture_float');
    // if (!extFloat) {
    //   throw new Error('OES_texture_float extension not supported');
    // }

    this.quad = engine.createFullscreenQuad();
    this.updateProgram = engine.createProgramFromShaders(
      engine.createShader(this.gl.VERTEX_SHADER, lifetimeTextureVertexShader),
      engine.createShader(this.gl.FRAGMENT_SHADER, lifetimeTextureFragmentShader),
    ) as WebGLProgram;

    // Initialize textures and framebuffers
    this.currentTexture = this.createTexture(LifetimeTexture.generateInitialData(this.width, this.height));
    this.targetTexture = this.createTexture(null);

    this.currentFBO = this.createFramebuffer(this.currentTexture);
    this.targetFBO = this.createFramebuffer(this.targetTexture);
  }

  createTexture(data: Float32Array | null): WebGLTexture {
    const texture = this.gl.createTexture() as WebGLTexture;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.width, this.height, 0, this.gl.RGBA, this.gl.FLOAT, data);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    return texture;
  }

  private createFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
    const fbo = this.gl.createFramebuffer() as WebGLFramebuffer;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    return fbo;
  }

  update(deltaTime: number): void {
    // Use the update shader program
    this.gl.useProgram(this.updateProgram);

    // Bind current lifetime texture to texture unit 0
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
    const locCurrentState = this.gl.getUniformLocation(this.updateProgram, 'u_currentLifetime');
    this.gl.uniform1i(locCurrentState, 0);

    // Set deltaTime uniform
    const locDeltaTime = this.gl.getUniformLocation(this.updateProgram, 'u_deltaTime');
    this.gl.uniform1f(locDeltaTime, deltaTime);

    // Bind the target framebuffer for rendering
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.targetFBO);

    // Set viewport to texture size
    this.gl.viewport(0, 0, this.width, this.height);

    // Bind and enable the fullscreen quad buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad);
    const a_position = this.gl.getAttribLocation(this.updateProgram, 'a_position');
    this.gl.enableVertexAttribArray(a_position);
    this.gl.vertexAttribPointer(a_position, 2, this.gl.FLOAT, false, 0, 0);

    // Draw the fullscreen quad (two triangles)
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    // Unbind framebuffer to return to default
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    // Swap textures and framebuffers for the next update
    [this.currentTexture, this.targetTexture] = [this.targetTexture, this.currentTexture];
    [this.currentFBO, this.targetFBO] = [this.targetFBO, this.currentFBO];
  }

  private static generateInitialData(width: number, height: number): Float32Array {
    const data = new Float32Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 0] = 3.0; // Initial lifetime (e.g., 3 seconds)
      data[i * 4 + 1] = 0.0; // Unused
      data[i * 4 + 2] = 0.0; // Unused
      data[i * 4 + 3] = 0.0; // Unused
    }
    return data;
  }
}
