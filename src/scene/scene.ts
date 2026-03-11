import type { Entity } from '../entities/entity/entity';
import { Light } from './light';
import type { Vec3 } from '../vec3';
import type { Camera } from './camera';

export { Light } from './light';

export class Scene {
  readonly light: Light;
  readonly camera: Camera;

  private entities: Entity[] = [];
  private viewPosition!: Vec3;

  constructor(options: {
    /** Light for the scene. If omitted, a default light is created and wired to refresh entities on change. */
    light?: Light;
    camera: Camera;
  }) {
    this.light = options?.light ?? new Light({ position: this.viewPosition });
    this.light.onUpdate(() => this.refreshEntitySetup());
    this.camera = options.camera;
    this.camera.onUpdate(() => {
      this.light.setPosition(this.camera.viewPosition);
      this.refreshEntitySetup();
    });

    for (const entity of this.entities) {
      entity.setup(this.camera, this.light);
    }
  }

  update() {
    this.camera.update();
  }

  /** Re-run setup on all entities with current camera and light. Called automatically when the default light changes. */
  refreshEntitySetup() {
    for (const entity of this.entities) {
      entity.setup(this.camera, this.light);
    }
  }

  add(entity: Entity) {
    this.entities.push(entity);
    entity.setup(this.camera, this.light);
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
