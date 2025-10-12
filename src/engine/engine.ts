import type { Scene } from '../scene/scene';
import { Vec2 } from '../vec2';

/**
 * Particular is a class that represents an object to handle ad draw particle effects on the screen.
 *  */
export class Engine {
  static BindingPoints = {
    Camera: 0,
  };

  readonly gl: WebGL2RenderingContext;
  private scenes: Scene[] = [];
  public resolution: Vec2 = new Vec2(0, 0);
  public pixelRatio: number;
  private size: Vec2;

  private time = 0;
  private paused = true;

  // Rendering
  private textureA: WebGLTexture;
  private bufferA: WebGLFramebuffer;
  private textureB: WebGLTexture;
  private bufferB: WebGLFramebuffer;

  private currentRenderTarget: 'A' | 'B' = 'A';
  private postProcessingPipeline: ((sourceTexture: WebGLTexture) => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement | OffscreenCanvas,
    options: { pixelRation: number; size: Vec2; beforeSetup?: (gl: WebGLRenderingContext) => void },
  ) {
    this.pixelRatio = options.pixelRation;
    this.size = options.size;

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
    gl.clearColor(0, 0, 0, 0);
    options?.beforeSetup?.(this.gl);

    this.updateResolution();

    this.canvas.width = this.resolution.x;
    this.canvas.height = this.resolution.y;

    this.textureA = this.createFrameTexture();
    this.bufferA = this.createFrameBuffer();
    this.textureB = this.createFrameTexture();
    this.bufferB = this.createFrameBuffer();
  }

  addScene(scene: Scene) {
    this.scenes.push(scene);
    scene.setup();
  }

  /* Rendering */
  draw() {
    // render the scene
    const [targetTexture, targetBuffer] = this.getCurrentRenderTarget();
    this.attachRenderTarget(targetTexture, targetBuffer);
    this.clear();
    for (const scene of this.scenes) {
      scene.draw(this.time);
    }
    this.flipRenderTarget();

    // render the post-processing
    this.postProcessing();

    // reset the render target
    this.currentRenderTarget = 'A';
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
    let previousTime = performance.now();
    this.paused = false;

    const renderLoop = (timestamp: number) => {
      const delta = timestamp - previousTime;
      previousTime = timestamp;
      if (this.paused) return;
      this.time += delta;
      this.draw();
      requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
  }

  drawQuad() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /* Resize */
  resize(x: number, y: number) {
    this.size = new Vec2(x, y);
    this.updateResolution();

    console.log(this.resolution);

    this.canvas.width = this.resolution.x;
    this.canvas.height = this.resolution.y;

    this.textureA = this.createFrameTexture();
    this.bufferA = this.createFrameBuffer();
    this.textureB = this.createFrameTexture();
    this.bufferB = this.createFrameBuffer();

    for (const scene of this.scenes) {
      scene.setup();
    }

    this.draw();
  }

  private updateResolution() {
    const width = this.size.x;
    const height = this.size.y;
    const pixelWidth = width * this.pixelRatio;
    const pixelHeight = height * this.pixelRatio;

    this.resolution = new Vec2(pixelWidth, pixelHeight);
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this.gl.viewport(x, y, width, height);
  }

  resetViewport() {
    this.gl.viewport(0, 0, this.resolution.x, this.resolution.y);
  }

  /* Post Processing */
  attachPostProcessor(processor: (sourceTexture: WebGLTexture) => void) {
    this.postProcessingPipeline.push(processor);
  }

  postProcessing() {
    this.postProcessingPipeline.forEach((processor, index) => {
      const [targetTexture, targetBuffer] = this.getCurrentRenderTarget();
      const sourceTexture = this.getCurrentRenderSource();
      if (index !== this.postProcessingPipeline.length - 1) {
        this.attachRenderTarget(targetTexture, targetBuffer);
      } else {
        this.resetRenderTarget();
      }
      this.clear();
      processor(sourceTexture);
      this.resetRenderTarget();
      this.flipRenderTarget();
    });
  }

  /* Context */
  attachRenderTarget(texture: WebGLTexture, framebuffer: WebGLFramebuffer | null) {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
  }

  resetRenderTarget() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  resetBlend() {
    this.gl.disable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  /* Time */
  now(): number {
    return this.time;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.start();
  }

  skip(time: number) {
    this.time += time;
    this.draw();
  }

  togglePause() {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /* Factories */
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
    return framebuffer;
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
}
