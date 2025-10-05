// import { DownsampleBlur } from '../effects/downsampleBlur/downsampleBlur';
import type { Emitter } from '../emitter/emitter';
import type { Engine } from '../engine/engine';
import { M4 } from '../m4';
import { FadeShader, GaussianBlurShader, HighPassShader, QuadRenderer, ToneMappingShader } from '../textureRenderer/quadRenderer';

export class Scene {
  private gl: WebGL2RenderingContext;
  private emitters: Emitter[] = [];
  private readonly perspective: null | number;
  private sceneFrameTexture: WebGLTexture;
  private sceneFrameBuffer: WebGLFramebuffer;
  private effectFrameTextureA: WebGLTexture;
  private effectFrameBufferA: WebGLFramebuffer;
  private effectFrameTextureB: WebGLTexture;
  private effectFrameBufferB: WebGLFramebuffer;
  private HighPassShader: HighPassShader;
  private BlurShader: GaussianBlurShader;
  private ToneMappingShader: ToneMappingShader;
  private QuadRenderer: QuadRenderer;
  private FadeShader: FadeShader;
  // private effectApplyShader: TextureRenderer;

  constructor(
    private engine: Engine,
    options?: {
      perspective?: number;
    },
  ) {
    this.engine = engine;
    this.gl = engine.gl;
    this.perspective = options?.perspective ?? null;

    this.sceneFrameTexture = this.createSceneFrameTexture();
    this.sceneFrameBuffer = this.createSceneFrameBuffer();

    this.effectFrameTextureA = this.createSceneFrameTexture();
    this.effectFrameBufferA = this.createSceneFrameBuffer();
    this.effectFrameTextureB = this.createSceneFrameTexture();
    this.effectFrameBufferB = this.createSceneFrameBuffer();

    /* Setup new texture renderer */
    this.HighPassShader = new HighPassShader(this.engine, { highPassThreshold: 0.9 });
    this.BlurShader = new GaussianBlurShader(this.engine, { radius: 3.5 });
    // this.BlurShader = new GaussianBlurShader(this.engine, { radius: 3.5 });

    this.ToneMappingShader = new ToneMappingShader(this.engine);

    this.FadeShader = new FadeShader(this.engine, { fadeStartingPoint: 0.5 });
    this.QuadRenderer = new QuadRenderer(this.engine);

    this.engine.onResolutionsChange((resolution) => {
      this.sceneFrameTexture = this.createSceneFrameTexture();
      this.sceneFrameBuffer = this.createSceneFrameBuffer();
      this.effectFrameTextureA = this.createSceneFrameTexture();
      this.effectFrameBufferA = this.createSceneFrameBuffer();
      this.effectFrameTextureB = this.createSceneFrameTexture();
      this.effectFrameBufferB = this.createSceneFrameBuffer();
    });
  }

  createSceneFrameTexture(): WebGLTexture {
    const gl = this.gl;
    const resolution = this.engine.resolution;

    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create sceneFrameTexture');
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, resolution.x, resolution.y, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
  }

  createSceneFrameBuffer(): WebGLFramebuffer {
    const gl = this.gl;
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create framebuffer');
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return framebuffer;
  }

  setup(callback?: (gl: WebGL2RenderingContext) => void) {
    const gl = this.gl;
    const resolution = this.engine.resolution;

    this.engine.resetViewport();
    gl.clear(gl.COLOR_BUFFER_BIT);

    let projection: M4;
    let view: M4;

    if (this.perspective === null) {
      const longestDimension = Math.max(resolution.x, resolution.y);
      projection = M4.orthographic(0, resolution.x, resolution.y, 0, 0.1, longestDimension * 2);
      view = M4.translation(0, 0, -longestDimension);
    } else {
      // in case of perspective projection
      const fieldOfViewInRadians = 2 * Math.atan(resolution.y / 2 / this.perspective);
      projection = M4.perspective(fieldOfViewInRadians, resolution.x / resolution.y, 0.1, this.perspective * 10);
      // move camera back the distance and move origin bact to 0x 0y
      view = M4.translation(-resolution.x / 2, -resolution.y / 2, -this.perspective);
    }

    for (const emitter of this.emitters) {
      emitter.setup(projection, view);
    }

    callback?.(gl);
  }

  // Place an object on the screen. Emmitter is one of the objects that can be placed on the screen.
  add(emitter: Emitter) {
    this.emitters.push(emitter);
  }

  // Update the scene.
  update() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFrameTexture);

    this.engine.attachRenderTarget(this.sceneFrameTexture, this.sceneFrameBuffer);
    this.engine.clear();

    this.draw();

    this.engine.attachRenderTarget(this.effectFrameTextureA, this.effectFrameBufferA);
    this.engine.clear();
    this.FadeShader.draw(this.sceneFrameTexture);
    //
    this.engine.resetRenderTarget();

    // this.postProcessing();

    this.ToneMappingShader.draw(this.effectFrameTextureA);
  }

  // Draw the scene.
  draw() {
    for (const emitter of this.emitters) {
      emitter.draw();
    }
  }

  postProcessing() {
    const gl = this.gl;

    // High pass first, using sceneFrameTexture as input
    this.engine.attachRenderTarget(this.effectFrameTextureA, this.effectFrameBufferA);
    this.engine.clear();
    this.HighPassShader.draw(this.sceneFrameTexture);

    //Blur the high pass result, using effectFrameTextureA as input
    this.engine.attachRenderTarget(this.effectFrameTextureB, this.effectFrameBufferB);
    this.engine.clear();
    this.BlurShader.draw(this.effectFrameTextureA); //, this.effectFrameTextureB, this.effectFrameBufferB);

    // commit result to frame buffer
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.engine.attachRenderTarget(this.sceneFrameTexture, this.sceneFrameBuffer);

    this.QuadRenderer.draw(this.effectFrameTextureB);
    gl.disable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.engine.resetRenderTarget();
  }
}
