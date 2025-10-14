import type { Engine } from '../engine/engine';
import qadVertexShader from '../commonShaders/quadVertexShader.glsl';
import blurFragmentShader from './blurFragmentShader.glsl';
import gaussianBlurFragmentShader from './gaussianBlurFragmentShader.glsl';
import highPassFragmentShader from './highPassFragmentShader.glsl';
import toneMappingFragmentShader from './toneMappingFragmentShader.glsl';
import textureFragmentShader from './textureFragmentShader.glsl';

export class QuadRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly program: WebGLProgram;

  constructor(
    readonly engine: Engine,
    shader: string = textureFragmentShader,
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

export class HighPassShader extends QuadRenderer {
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

export class GaussianBlurShader extends QuadRenderer {
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

// export class GaussianBlurShader extends QuadRenderer {
//   // Keep the same API; "radius" here does not change kernel size in the LearnOpenGL separable blur.
//   // You can interpret it later as blur iterations if you want to extend it.
//   private readonly weights = new Float32Array([0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216]);
//
//   // Internal intermediate target for the first (horizontal) pass
//   private intermediateTex: WebGLTexture | null = null;
//   private intermediateFbo: WebGLFramebuffer | null = null;
//   private lastWidth = 0;
//   private lastHeight = 0;
//
//   // Radius kept only to preserve the ctor signature
//   // (not directly used by the fixed-kernel separable blur).
//   private radius: number;
//
//   constructor(engine: Engine, { radius }: { radius: number }) {
//     super(engine, gaussianBlurFragmentShader);
//     this.radius = radius;
//   }
//
//   private ensureIntermediateTarget(width: number, height: number) {
//     const gl = this.engine.gl;
//
//     if (this.intermediateTex && this.intermediateFbo && this.lastWidth === width && this.lastHeight === height) {
//       return;
//     }
//
//     // Clean old
//     if (this.intermediateTex) gl.deleteTexture(this.intermediateTex);
//     if (this.intermediateFbo) gl.deleteFramebuffer(this.intermediateFbo);
//
//     // Create texture
//     const tex = gl.createTexture();
//     if (!tex) throw new Error('GaussianBlurShader: failed to create intermediate texture');
//
//     gl.bindTexture(gl.TEXTURE_2D, tex);
//     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, null);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//     gl.bindTexture(gl.TEXTURE_2D, null);
//
//     // Create framebuffer
//     const fbo = gl.createFramebuffer();
//     if (!fbo) throw new Error('GaussianBlurShader: failed to create intermediate framebuffer');
//
//     // Attach texture to FBO
//     gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
//     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//
//     this.intermediateTex = tex;
//     this.intermediateFbo = fbo;
//     this.lastWidth = width;
//     this.lastHeight = height;
//   }
//
//   // Override draw to perform two passes (horizontal -> intermediate, vertical -> current framebuffer)
//   draw(sourceTexture: WebGLTexture) {
//     const gl = this.engine.gl;
//
//     // Prepare intermediate of current resolution
//     const { x: width, y: height } = this.engine.resolution;
//     this.ensureIntermediateTarget(width, height);
//
//     // Remember the currently bound draw framebuffer (the caller's target)
//     const prevFbo = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
//
//     // Use program and set weights once
//     gl.useProgram(this.program);
//     const uTextureLoc = gl.getUniformLocation(this.program, 'uTexture');
//     const uHorizontalLoc = gl.getUniformLocation(this.program, 'uHorizontal');
//     const uWeightsLoc = gl.getUniformLocation(this.program, 'uWeights');
//
//     if (!uTextureLoc || !uHorizontalLoc || !uWeightsLoc) {
//       throw new Error('GaussianBlurShader: failed to get uniform locations');
//     }
//
//     // Pass 1: Horizontal -> intermediate FBO
//     gl.bindFramebuffer(gl.FRAMEBUFFER, this.intermediateFbo);
//     gl.viewport(0, 0, width, height);
//
//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
//     gl.uniform1i(uTextureLoc, 0);
//     gl.uniform1i(uHorizontalLoc, 1);
//     gl.uniform1fv(uWeightsLoc, this.weights);
//
//     this.engine.drawQuad();
//
//     // Pass 2: Vertical -> back to the previously bound FBO (the caller's target)
//     gl.bindFramebuffer(gl.FRAMEBUFFER, prevFbo);
//     // viewport is assumed to be set by the caller's pipeline, but we can ensure it:
//     gl.viewport(0, 0, width, height);
//
//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, this.intermediateTex);
//     gl.uniform1i(uTextureLoc, 0);
//     gl.uniform1i(uHorizontalLoc, 0);
//     gl.uniform1fv(uWeightsLoc, this.weights);
//
//     this.engine.drawQuad();
//
//     // Cleanup bindings
//     gl.bindTexture(gl.TEXTURE_2D, null);
//   }
//
//   // preDraw no longer needed for this separable blur, but we keep the hook
//   // to preserve the superclass contract (no-op).
//   preDraw() {
//     // Intentionally empty: all uniforms are set inside draw() for each pass.
//   }
// }

export class ToneMappingShader extends QuadRenderer {
  constructor(engine: Engine) {
    super(engine, toneMappingFragmentShader);
  }
}
