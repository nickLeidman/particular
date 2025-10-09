import { Engine } from '../engine/engine';
import type { M4 } from '../m4';

export abstract class Entity {
  protected readonly gl: WebGL2RenderingContext;
  protected readonly engine: Engine;
  protected readonly program: WebGLProgram;

  protected constructor(engine: Engine, program: WebGLProgram) {
    this.gl = engine.gl;
    this.engine = engine;
    this.program = program;
  }

  abstract draw(): void;

  setup(projection: M4, view: M4) {
    const gl = this.gl;
    gl.useProgram(this.program);

    const cameraBuffer = gl.createBuffer();
    if (!cameraBuffer) {
      throw new Error('Failed to create buffer');
    }
    const cameraReference = gl.getUniformBlockIndex(this.program, 'Camera');
    gl.uniformBlockBinding(this.program, cameraReference, Engine.BindingPoints.Camera);

    gl.bindBufferBase(gl.UNIFORM_BUFFER, Engine.BindingPoints.Camera, cameraBuffer);

    const cameraData = new Float32Array([...projection.toData(), ...view.toData()]);

    gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array(cameraData), gl.DYNAMIC_DRAW);
  }
}
