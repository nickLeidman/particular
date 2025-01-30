import type { Engine } from '../engine/engine';
import { M4 } from '../m4';
import { Noise } from '../noise/noise';
import type { Particle } from '../particle/particle';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';

const CAMERA_BINDING_POINT = 0;
const EMITTER_BINDING_POINT = 1;

export class Emitter {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly particleBuffer: WebGLBuffer;
  private noise: WebGLTexture;

  private batches: { particle: Particle; data: Float32Array }[] = [];

  constructor(private engine: Engine) {
    this.engine = engine;
    this.gl = engine.gl;

    const noise = new Noise(engine, 256);
    this.noise = noise.render();

    const vertexShader = this.engine.createShader(this.gl.VERTEX_SHADER, emitterVertexShader);
    const fragmentShader = this.engine.createShader(this.gl.FRAGMENT_SHADER, emitterFragmentShader);
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
    this.gl.uniformBlockBinding(this.program, this.gl.getUniformBlockIndex(this.program, 'Emitter'), EMITTER_BINDING_POINT);
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, EMITTER_BINDING_POINT, this.particleBuffer);
    this.gl.bufferData(this.gl.UNIFORM_BUFFER, 44 * Float32Array.BYTES_PER_ELEMENT, this.gl.DYNAMIC_DRAW);
  }

  emit(particle: Particle) {
    const particleMatrix = M4.scaling(0.5 * this.engine.pixelRatio, 1 * this.engine.pixelRatio, 1 * this.engine.pixelRatio);
    const world = M4.translation(particle.origin.x * this.engine.pixelRatio, particle.origin.y * this.engine.pixelRatio, 0);
    const particleBufferData = new Float32Array([
      particle.gravity.x, // gravity x
      particle.gravity.y, // gravity y
      particle.gravity.z, // gravity z
      particle.v0, // v0
      particle.startTime % (256 * 256), // batch id, mod 256^2
      particle.lifeTime / 1000, // lifetime in seconds
      0, // age in seconds
      particle.size, // size
      particle.drag,
      particle.angularDrag,
      particle.spawnDuration / 1000, // spawn duration in seconds
      0,
      ...world.toData(),
      ...particleMatrix.toData(),
    ]);

    this.batches.push({ particle, data: particleBufferData });
  }

  draw() {
    this.gl.useProgram(this.program);
    const currentTime = performance.now();
    const offset = 0;
    // bind noise texture
    const uNoiseTextureLocation = this.gl.getUniformLocation(this.program, 'uNoiseTexture');
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noise);
    this.gl.uniform1i(uNoiseTextureLocation, 0); // Assign texture unit 0

    for (let index = 0; index < this.batches.length; index++) {
      const particle = this.batches[index].particle;
      const startTime = particle.startTime;
      const lifeTime = particle.lifeTime;
      const age = currentTime - startTime;
      const vertexCount = particle.count * 3;

      if (age > lifeTime + particle.spawnDuration) {
        // remove batch
        this.batches.splice(index, 1);
        index--;
        continue;
      }

      this.batches[index].data[6] = age / 1000;

      this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, EMITTER_BINDING_POINT, this.particleBuffer);
      this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, this.particleBuffer);
      this.gl.bufferData(this.gl.UNIFORM_BUFFER, this.batches[index].data, this.gl.DYNAMIC_DRAW);

      this.gl.drawArrays(this.gl.TRIANGLES, offset, vertexCount);
    }
    this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
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
