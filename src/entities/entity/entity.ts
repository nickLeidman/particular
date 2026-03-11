import { Engine } from '../../engine/engine';
import type { Light } from '../../scene/light';
import type { Camera } from '../../scene/camera';

export abstract class Entity {
  protected readonly gl: WebGL2RenderingContext;
  protected readonly engine: Engine;
  protected readonly program: WebGLProgram;

  protected constructor(engine: Engine, program: WebGLProgram) {
    this.gl = engine.gl;
    this.engine = engine;
    this.program = program;
  }

  abstract draw(time: number): void;

  /** Whether this entity will produce visible draw calls this frame. Used to skip full-screen clear when idle. Default true (clear when in doubt). */
  hasActiveContent(): boolean {
    return true;
  }

  setup(camera: Camera, light: Light) {
    const gl = this.gl;
    gl.useProgram(this.program);

    const cameraBuffer = gl.createBuffer();
    if (!cameraBuffer) {
      throw new Error('Failed to create buffer');
    }
    const cameraReference = gl.getUniformBlockIndex(this.program, 'Camera');
    gl.uniformBlockBinding(this.program, cameraReference, Engine.BindingPoints.Camera);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, Engine.BindingPoints.Camera, cameraBuffer);
    gl.bufferData(
      gl.UNIFORM_BUFFER,
      new Float32Array([...camera.projection.toData(), ...camera.view.toData(), ...camera.viewPosition.value, 0]),
      gl.DYNAMIC_DRAW,
    );

    const lightBuffer = gl.createBuffer();
    if (!lightBuffer) {
      throw new Error('Failed to create buffer');
    }
    const lightReference = gl.getUniformBlockIndex(this.program, 'Lighting');
    gl.uniformBlockBinding(this.program, lightReference, Engine.BindingPoints.Lighting);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, Engine.BindingPoints.Lighting, lightBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array([...light.position.value, 0, ...light.color.value, 0]), gl.DYNAMIC_DRAW);
  }
}
