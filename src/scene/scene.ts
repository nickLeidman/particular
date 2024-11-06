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

  constructor(private engine: Engine) {
    this.engine = engine;
    this.gl = engine.gl;
  }

  setup(callback?: (gl: WebGL2RenderingContext) => void) {
    const gl = this.gl;
    const resolution = this.engine.resolution;

    this.engine.resetViewport();
    gl.clear(gl.COLOR_BUFFER_BIT);

    const projection = M4.translation(resolution.x / 2, resolution.y / 2, 0);

    for (const emitter of this.emitters) {
      emitter.setup(projection, resolution);
    }

    callback?.(gl);
  }

  // Place an object on the screen. Emmitter is one of the objects that can be placed on the screen.
  add(emitter: Emitter) {
    this.emitters.push(emitter);
  }

  // Update the scene.
  update(deltaTime: number) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (const emitter of this.emitters) {
      emitter.update();
    }
    this.draw();
  }

  // Draw the scene.
  draw() {
    for (const emitter of this.emitters) {
      emitter.draw();
    }
  }
}
