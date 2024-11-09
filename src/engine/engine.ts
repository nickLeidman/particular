import type { Scene } from '../scene/scene';
import { Vec2 } from '../vec2';

/**
 * Particular is a class that represents an object to handle ad draw particle effects on the screen.
 *  */
export class Engine {
  private canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  private scenes: Scene[] = [];
  public resolution: Vec2 = new Vec2(0, 0);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    if (!canvas) {
      throw new Error('Canvas is not defined');
    }
    const gl = canvas.getContext('webgl2', {
      // preserveDrawingBuffer: true,
    });
    if (!gl) {
      throw new Error('WebGL is not supported');
    }
    this.gl = gl;

    window.addEventListener('resize', (event) => {
      this.setup(() => {
        for (const scene of this.scenes) {
          scene.setup();
        }
      });
    });
  }

  setup(callback: (gl: WebGLRenderingContext) => void) {
    callback(this.gl);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = window.devicePixelRatio;
    const pixelWidth = width * ratio;
    const pixelHeight = height * ratio;

    this.resolution = new Vec2(pixelWidth, pixelHeight);

    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  addScene(scene: Scene) {
    this.scenes.push(scene);
  }

  start() {
    for (const scene of this.scenes) {
      scene.setup();
    }

    const renderLoop = () => {
      for (const scene of this.scenes) {
        scene.update();
      }
      requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);
  }

  resetViewport() {
    this.gl.viewport(0, 0, this.resolution.x, this.resolution.y);
  }

  createFullscreenQuad(): WebGLBuffer {
    const buffer = this.gl.createBuffer() as WebGLBuffer;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    // Unbind the buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    return buffer;
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

  createProgramFromShaders(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = this.gl.createProgram();

    if (!program) {
      return program;
    }

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    const success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
    if (success) {
      return program;
    }

    this.gl.deleteProgram(program);
    return null;
  }
}
