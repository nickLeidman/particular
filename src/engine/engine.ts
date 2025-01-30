import { Emitter } from '../emitter/emitter';
import { M4 } from '../m4';
import { Scene } from '../scene/scene';
import { Vec2 } from '../vec2';

/**
 * Particular is a class that represents an object to handle ad draw particle effects on the screen.
 *  */
export class Engine {
  private canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  private scenes: Scene[] = [];
  public resolution: Vec2 = new Vec2(0, 0);
  public pixelRatio = window.devicePixelRatio;

  static Scene = Scene;
  static Emitter = Emitter;

  constructor(
    private root: HTMLDivElement,
    options?: { beforeSetup?: (gl: WebGLRenderingContext) => void },
  ) {
    const canvas = document.createElement('canvas');
    this.root.appendChild(canvas);
    this.canvas = canvas;
    if (!canvas) {
      throw new Error('Canvas is not defined');
    }
    const gl = canvas.getContext('webgl2', {
      // preserveDrawingBuffer: true,
      // premultipliedAlpha: false,
    });
    if (!gl) {
      throw new Error('WebGL is not supported');
    }
    this.gl = gl;

    options?.beforeSetup?.(this.gl);

    window.addEventListener('resize', (event) => {
      this.setup();
      for (const scene of this.scenes) {
        scene.setup();
      }
    });

    this.setup();
  }

  setup() {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    const pixelWidth = width * this.pixelRatio;
    const pixelHeight = height * this.pixelRatio;

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
    console.log(this.gl.getProgramInfoLog(program));
    if (success) {
      return program;
    }

    this.gl.deleteProgram(program);
    return null;
  }
}

export const Particular = Engine;
