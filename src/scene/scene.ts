import { Axis } from '../axis/axis';
import type { Emitter } from '../emitter/emitter';
import type { Engine } from '../engine/engine';
import { M4 } from '../m4';

export class Scene {
  private gl: WebGL2RenderingContext;
  private emitters: Emitter[] = [];
  private readonly perspective: null | number;
  private axis: Axis;

  constructor(
    private engine: Engine,
    options?: {
      perspective?: number;
    },
  ) {
    this.engine = engine;
    this.gl = engine.gl;
    this.perspective = options?.perspective ?? null;
    this.axis = new Axis(this.engine);
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

    this.axis.setup(projection, view);

    callback?.(gl);
  }

  // Place an object on the screen. Emmitter is one of the objects that can be placed on the screen.
  add(emitter: Emitter) {
    this.emitters.push(emitter);
  }

  // Update the scene.
  update() {
    // this.engine.resetViewport();
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.draw();
  }

  // Draw the scene.
  draw() {
    for (const emitter of this.emitters) {
      emitter.draw();
    }
    // this.axis.draw();
  }
}
