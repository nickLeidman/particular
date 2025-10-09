import type { Engine } from '../engine/engine';
import { M4 } from '../m4';
import type { Entity } from '../entity/entity';

export class Scene {
  private gl: WebGL2RenderingContext;
  private entities: Entity[] = [];
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

  setup() {
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
      // move the camera back the distance and move origin back to 0x 0y
      view = M4.translation(-resolution.x / 2, -resolution.y / 2, -this.perspective);
    }

    for (const entity of this.entities) {
      entity.setup(projection, view);
    }
  }

  add(entity: Entity) {
    this.entities.push(entity);
  }

  // Update the scene.
  draw() {
    for (const entity of this.entities) {
      entity.draw();
    }
  }

  // postProcessing() {
  //   const gl = this.gl;
  //
  //   // High pass first, using sceneFrameTexture as input
  //   this.engine.attachRenderTarget(this.effectFrameTextureA, this.effectFrameBufferA);
  //   this.engine.clear();
  //   this.HighPassShader.draw(this.sceneFrameTexture);
  //
  //   //Blur the high pass result, using effectFrameTextureA as input
  //   this.engine.attachRenderTarget(this.effectFrameTextureB, this.effectFrameBufferB);
  //   this.engine.clear();
  //   this.BlurShader.draw(this.effectFrameTextureA, this.effectFrameTextureB, this.effectFrameBufferB);
  //
  //   // commit result to frame buffer
  //   gl.enable(gl.BLEND);
  //   gl.blendFunc(gl.ONE, gl.ONE);
  //   this.engine.attachRenderTarget(this.sceneFrameTexture, this.sceneFrameBuffer);
  //
  //   this.QuadRenderer.draw(this.effectFrameTextureB);
  //   gl.disable(gl.BLEND);
  //   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  //
  //   this.engine.resetRenderTarget();
  // }
}
