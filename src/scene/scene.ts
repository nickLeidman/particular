import type { Engine } from '../engine/engine';
import type { Entity } from '../entities/entity/entity';
import { Light } from './light';
import { M4 } from '../m4';
import { Vec3 } from '../vec3';

export { Light } from './light';

export class Scene {
  readonly light: Light;

  private gl: WebGL2RenderingContext;
  private entities: Entity[] = [];
  private readonly perspective: null | number;
  private projection: M4;
  private view: M4;
  private viewPosition: Vec3;

  constructor(
    private engine: Engine,
    options?: {
      perspective?: number;
      /** Light for the scene. If omitted, a default light is created and wired to refresh entities on change. */
      light?: Light;
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
      this.viewPosition = new Vec3(resolution.x / 2, resolution.y / 2, 0);
    } else {
      const fieldOfViewInRadians = 2 * Math.atan(resolution.y / 2 / this.perspective);
      this.projection = M4.perspective(fieldOfViewInRadians, resolution.x / resolution.y, 100, this.perspective * 2);
      this.view = M4.translation(-resolution.x / 2, -resolution.y / 2, -this.perspective);
      this.viewPosition = new Vec3(resolution.x / 2, resolution.y / 2, this.perspective);
    }

    this.light = options?.light ?? new Light({ position: this.viewPosition, onChange: () => this.refreshEntitySetup() });

    for (const entity of this.entities) {
      entity.setup(this.projection, this.view, this.viewPosition, this.light);
    }

    engine.addScene(this);
  }

  /** Re-run setup on all entities with current camera and light. Called automatically when the default light changes. */
  refreshEntitySetup() {
    for (const entity of this.entities) {
      entity.setup(this.projection, this.view, this.viewPosition, this.light);
    }
  }

  add(entity: Entity) {
    this.entities.push(entity);
    entity.setup(this.projection, this.view, this.viewPosition, this.light);
  }

  remove(entity: Entity) {
    const i = this.entities.indexOf(entity);
    if (i !== -1) this.entities.splice(i, 1);
  }

  /** True if any entity will draw this frame (e.g. emitter has batches). Used to clear only when needed. */
  hasActiveContent(): boolean {
    return this.entities.some((e) => e.hasActiveContent());
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
