import type { Engine } from '../engine/engine';
import type { M4 } from '../m4';
import axisFragmentShader from './axisFragmentShader.glsl';
import axisVertexShader from './axisVertexShader.glsl';

const CAMERA_BINDING_POINT = 0;

export class Axis {
  private gl: Engine['gl'];
  private program: WebGLProgram;

  constructor(private engine: Engine) {
    this.gl = engine.gl;

    const vertexShader = this.engine.createShader(this.gl.VERTEX_SHADER, axisVertexShader);
    const fragmentShader = this.engine.createShader(this.gl.FRAGMENT_SHADER, axisFragmentShader);
    const program = this.engine.createProgramFromShaders(vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create program');
    }
    this.program = program;
  }

  draw() {
    const gl = this.gl;
    gl.useProgram(this.program);
    // draw three lines
    gl.drawArrays(gl.LINES, 0, 6);
  }

  setup(projection: M4, view: M4) {
    const gl = this.gl;
    gl.useProgram(this.program);

    const cameraBuffer = gl.createBuffer();
    if (!cameraBuffer) {
      throw new Error('Failed to create buffer');
    }
    const cameraReference = gl.getUniformBlockIndex(this.program, 'Camera');
    gl.uniformBlockBinding(this.program, cameraReference, CAMERA_BINDING_POINT);

    gl.bindBufferBase(gl.UNIFORM_BUFFER, CAMERA_BINDING_POINT, cameraBuffer);

    const cameraData = new Float32Array([...projection.toData(), ...view.toData()]);

    gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array(cameraData), gl.DYNAMIC_DRAW);
  }
}
