import type { Engine } from '../engine/engine';
import type { Entity } from '../entities/entity/entity';
import { M4 } from '../m4';

export class Scene {
  private gl: WebGL2RenderingContext;
  private entities: Entity[] = [];
  private readonly perspective: null | number;
  private projection: M4;
  private view: M4;

  constructor(
    private engine: Engine,
    options?: {
      perspective?: number;
    },
  ) {
    this.engine = engine;
    this.gl = engine.gl;
    this.perspective = options?.perspective ?? null;

    const gl = this.gl;
    const resolution = this.engine.resolution;

    this.engine.resetViewport();
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.perspective === null) {
      const longestDimension = Math.max(resolution.x, resolution.y);
      this.projection = M4.orthographic(0, resolution.x, resolution.y, 0, 0.1, longestDimension * 2);
      this.view = M4.translation(0, 0, -longestDimension);
    } else {
      // in case of perspective projection
      const fieldOfViewInRadians = 2 * Math.atan(resolution.y / 2 / this.perspective);
      this.projection = M4.perspective(fieldOfViewInRadians, resolution.x / resolution.y, 100, this.perspective * 2);
      // move the camera back the distance and move origin back to 0x 0y
      this.view = M4.translation(-resolution.x / 2, -resolution.y / 2, -this.perspective);
    }

    for (const entity of this.entities) {
      entity.setup(this.projection, this.view);
    }

    engine.addScene(this);
  }

  add(entity: Entity) {
    this.entities.push(entity);
    entity.setup(this.projection, this.view);
  }

  // Update the scene.
  draw(time: number) {
    for (const entity of this.entities) {
      entity.draw(time);
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
