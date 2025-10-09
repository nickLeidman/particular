import { Emitter } from '../emitter/emitter';
import { ParticleBatch } from '../particle/particleBatch';
import { Scene } from '../scene/scene';
import { Vec2 } from '../vec2';
import { QuadRenderer, ToneMappingShader } from '../textureRenderer/quadRenderer';
import { TextureLoader } from '../textureLoader/textureLoader';

/**
 * Particular is a class that represents an object to handle ad draw particle effects on the screen.
 *  */
export class Engine {
  static Scene = Scene;
  static Emitter = Emitter;
  static ParticleBatch = ParticleBatch;
  static QuadShader = QuadRenderer;

  static BindingPoints = {
    Camera: 0,
  };

  readonly gl: WebGL2RenderingContext;
  private scenes: Scene[] = [];
  public resolution: Vec2 = new Vec2(0, 0);
  public pixelRatio = 2; //window.devicePixelRatio;

  private resolutionChangeCallbacks: Set<(resolution: Vec2) => void> = new Set();

  public TextureLoader: TextureLoader;

  // Rendering
  private textureA: WebGLTexture;
  private bufferA: WebGLFramebuffer;
  private textureB: WebGLTexture;
  private bufferB: WebGLFramebuffer;

  private currentRenderTarget: 'A' | 'B' = 'A';
  private postProcessingPipeline: ((sourceTexture: WebGLTexture) => void)[] = [];

  // Shaders
  private ToneMappingShader: ToneMappingShader;

  constructor(
    private canvas: HTMLCanvasElement | OffscreenCanvas,
    private size: Vec2,
    options?: { beforeSetup?: (gl: WebGLRenderingContext) => void },
  ) {
    const gl = canvas.getContext('webgl2', {
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    });
    if (!gl) {
      throw new Error('WebGL is not supported');
    }
    this.gl = gl;
    const ext = gl.getExtension('EXT_color_buffer_float');

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    options?.beforeSetup?.(this.gl);

    this.setup();

    this.TextureLoader = new TextureLoader(this);

    // Rendering
    this.ToneMappingShader = new ToneMappingShader(this);

    this.textureA = this.createFrameTexture();
    this.bufferA = this.createFrameBuffer();
    this.textureB = this.createFrameTexture();
    this.bufferB = this.createFrameBuffer();
  }

  attachPostProcessor(processor: (sourceTexture: WebGLTexture) => void) {
    this.postProcessingPipeline.push(processor);
  }

  setup() {
    const width = this.size.x;
    const height = this.size.y;
    const pixelWidth = width * this.pixelRatio;
    const pixelHeight = height * this.pixelRatio;

    this.resolution = new Vec2(pixelWidth, pixelHeight);

    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    // this.canvas.style.width = `${width}px`;
    // this.canvas.style.height = `${height}px`;

    this.gl.clearColor(0, 0, 0, 0);
  }

  addScene(scene: Scene) {
    this.scenes.push(scene);
  }

  draw() {
    const [targetTexture, targetBuffer] = this.getCurrentRenderTarget();
    this.attachRenderTarget(targetTexture, targetBuffer);
    this.clear();

    for (const scene of this.scenes) {
      scene.draw();
    }

    this.flipRenderTarget();

    this.postProcessing();

    this.commit();
    this.currentRenderTarget = 'A';
  }

  postProcessing() {
    for (const processor of this.postProcessingPipeline) {
      const [targetTexture, targetBuffer] = this.getCurrentRenderTarget();
      const sourceTexture = this.getCurrentRenderSource();
      this.attachRenderTarget(targetTexture, targetBuffer);
      this.clear();
      processor(sourceTexture);
      this.resetRenderTarget();
      this.flipRenderTarget();
    }
  }

  commit() {
    this.resetRenderTarget();
    this.clear();
    this.ToneMappingShader.draw(this.getCurrentRenderSource());
    this.resetRenderTarget();
  }

  getCurrentRenderTarget(): [WebGLTexture, WebGLFramebuffer] {
    return [
      this.currentRenderTarget === 'A' ? this.textureA : this.textureB,
      this.currentRenderTarget === 'A' ? this.bufferA : this.bufferB,
    ];
  }

  getCurrentRenderSource() {
    return this.currentRenderTarget === 'A' ? this.textureB : this.textureA;
  }

  flipRenderTarget() {
    this.currentRenderTarget = this.currentRenderTarget === 'A' ? 'B' : 'A';
  }

  start() {
    for (const scene of this.scenes) {
      scene.setup();
    }

    const renderLoop = () => {
      this.draw();
      requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this.gl.viewport(x, y, width, height);
  }

  resetViewport() {
    this.gl.viewport(0, 0, this.resolution.x, this.resolution.y);
  }

  createShader(type: number, source: string) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!success) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Failed to compile shader');
    }
    return shader;
  }

  createProgramFromShaders(vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = this.gl.createProgram();

    if (!program) {
      throw new Error('Failed to create program');
    }

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    const success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
    if (!success) {
      console.log(this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      throw new Error('Failed to link program');
    }
    return program;
  }

  createFrameTexture(): WebGLTexture {
    const gl = this.gl;
    const resolution = this.resolution;

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

  createFrameBuffer(): WebGLFramebuffer {
    const gl = this.gl;
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create framebuffer');
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return framebuffer;
  }

  onResolutionsChange(callback: (resolution: Vec2) => void) {
    this.resolutionChangeCallbacks.add(callback);
  }

  attachRenderTarget(texture: WebGLTexture, framebuffer: WebGLFramebuffer | null) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
  }

  resetRenderTarget() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  drawQuad() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}

export const Particular = Engine;
