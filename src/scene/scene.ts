import type { Emitter } from '../emitter/emitter';
import type { Engine } from '../engine/engine';
import { M3 } from '../m3';
import { M4 } from '../m4';

export enum SceneUniforms {
  Resolution = 'u_resolution',
  Projection = 'u_projection',
}

export class Scene {
  private gl: WebGL2RenderingContext;
  private emitters: Emitter[] = [];
  private readonly perspective: null | number;

  constructor(
    private engine: Engine,
    options?: {
      perspective?: number;
    },
  ) {
    this.engine = engine;
    this.gl = engine.gl;
    this.perspective = options?.perspective ?? null;
  }

  setup(callback?: (gl: WebGL2RenderingContext) => void) {
    const gl = this.gl;
    const resolution = this.engine.resolution;

    this.engine.resetViewport();
    gl.clear(gl.COLOR_BUFFER_BIT);

    let projection: M4;
    let view = M4.identity();

    if (this.perspective === null) {
      projection = M4.orthographic(0, resolution.x, resolution.y, 0, 0.1, 2000);
    } else {
      // in case of perspective projection
      const fieldOfViewInRadians = 2 * Math.atan(resolution.y / 2 / this.perspective);
      projection = M4.perspective(fieldOfViewInRadians, resolution.x / resolution.y, 0.1, this.perspective * 2);
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
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.engine.resetViewport();
    this.draw();
  }

  // Draw the scene.
  draw() {
    for (const emitter of this.emitters) {
      emitter.draw();
    }
  }
}
