import type { Engine } from '../engine/engine';
import { M3 } from '../m3';
import { M4 } from '../m4';
import type { Particle } from '../particle/particle';
import type { Vec2 } from '../vec2';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';

const CAMERA_BINDING_POINT = 0;
const PARTICLE_BINDING_POINT = 1;

export class Emitter {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private particleBuffer: WebGLBuffer;

  private batches: { particle: Particle; data: Float32Array }[] = [];

  constructor(private engine: Engine) {
    this.engine = engine;
    this.gl = engine.gl;

    const gl = this.gl;
    const vertexShader = this.engine.createShader(gl.VERTEX_SHADER, emitterVertexShader);
    const fragmentShader = this.engine.createShader(gl.FRAGMENT_SHADER, emitterFragmentShader);
    const program = this.engine.createProgramFromShaders(vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create program');
    }

    this.program = program;

    const particleBuffer = this.gl.createBuffer();
    if (!particleBuffer) {
      throw new Error('Failed to create particleBuffer');
    }
    this.particleBuffer = particleBuffer;
    this.gl.uniformBlockBinding(this.program, this.gl.getUniformBlockIndex(this.program, 'Particle'), PARTICLE_BINDING_POINT);
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, PARTICLE_BINDING_POINT, this.particleBuffer);
    this.gl.bufferData(this.gl.UNIFORM_BUFFER, 24 * Float32Array.BYTES_PER_ELEMENT, this.gl.DYNAMIC_DRAW);
  }

  emit(particle: Particle) {
    const particleCenter = M4.translation(-(1 / 4), -(3 / 4), 0);
    const particleBufferData = new Float32Array([
      particle.startTime,
      particle.lifeTime,
      0, // current time
      0, // size
      0, // gravity x
      0, // gravity y
      0, // gravity z
      0, // padding
      ...particleCenter.toData(),
    ]);

    this.batches.push({ particle, data: particleBufferData });
  }

  update() {
    this.gl.useProgram(this.program);
    this.engine.resetViewport();
  }

  draw() {
    const currentTime = performance.now();
    for (let index = 0; index < this.batches.length; index++) {
      const particle = this.batches[index].particle;
      const startTime = particle.startTime;
      const lifeTime = particle.lifeTime;
      const elapsedTime = currentTime - startTime;
      if (elapsedTime > lifeTime) {
        // remove batch
        this.batches.splice(index, 1);
        continue;
      }

      this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.particleBuffer);
      this.batches[index].data[2] = currentTime;
      this.batches[index].data[3] = particle.size;
      this.gl.bufferData(this.gl.UNIFORM_BUFFER, this.batches[index].data, this.gl.DYNAMIC_DRAW);

      this.gl.drawArrays(this.gl.TRIANGLES, 0, particle.count * 3);
    }
  }

  setup(projection: M4, resolution: Vec2) {
    const gl = this.gl;
    gl.useProgram(this.program);

    const cameraBuffer = gl.createBuffer();
    if (!cameraBuffer) {
      throw new Error('Failed to create buffer');
    }
    const cameraReference = gl.getUniformBlockIndex(this.program, 'Camera');
    gl.uniformBlockBinding(this.program, cameraReference, CAMERA_BINDING_POINT);

    gl.bindBufferBase(gl.UNIFORM_BUFFER, CAMERA_BINDING_POINT, cameraBuffer);

    const cameraData = new Float32Array([resolution.x, resolution.y, 0, 0, ...projection.toData()]);

    gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array(cameraData), gl.DYNAMIC_DRAW);
  }
}
