import type { Engine } from '../engine/engine';
import { M4 } from '../m4';
import { Noise } from '../noise/noise';
import type { ParticleBatch } from '../particle/particleBatch';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';
import emitterVertexShader2d from './emitterVertexShader2d.glsl';
import type { EmitterOptions } from './types';

const CAMERA_BINDING_POINT = 0;
const EMITTER_BINDING_POINT = 1;

const FREEZE_ON_MS = null;
// const FREEZE_ON_MS = 200;

export class Emitter {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly particleBuffer: WebGLBuffer;
  private noise: WebGLTexture;
  private particleTexture?: WebGLTexture;

  private batches: { particleBatch: ParticleBatch; data: Float32Array }[] = [];

  constructor(
    private engine: Engine,
    private options: EmitterOptions,
  ) {
    this.engine = engine;
    this.gl = engine.gl;

    const noise = new Noise(engine, 256);
    this.noise = noise.render();

    this.program = this.engine.createProgramFromShaders(
      this.options.is2d ? emitterVertexShader2d : emitterVertexShader,
      emitterFragmentShader,
    );

    const particleBuffer = this.gl.createBuffer();
    if (!particleBuffer) {
      throw new Error('Failed to create particleBuffer');
    }
    this.particleBuffer = particleBuffer;
    this.gl.uniformBlockBinding(this.program, this.gl.getUniformBlockIndex(this.program, 'Emitter'), EMITTER_BINDING_POINT);
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, EMITTER_BINDING_POINT, this.particleBuffer);
    this.gl.bufferData(this.gl.UNIFORM_BUFFER, 44 * Float32Array.BYTES_PER_ELEMENT, this.gl.DYNAMIC_DRAW);

    fetch(this.options.texture, { mode: 'cors' })
      .then((res) => res.blob())
      .then((blob) => createImageBitmap(blob, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' }))
      .then((bitmap) => {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmap);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
        this.particleTexture = texture;
      });
  }

  async emit(particleBatch: ParticleBatch) {
    const particleMatrix = M4.scaling(particleBatch.aspectRatio * this.engine.pixelRatio, this.engine.pixelRatio, this.engine.pixelRatio);
    const world = M4.translation(particleBatch.origin.x * this.engine.pixelRatio, particleBatch.origin.y * this.engine.pixelRatio, 0);

    // particle buffer data, structured using std140 layout
    const particleBufferData = new Float32Array([
      /* Time Block */
      0, // age in seconds, filled in draw method
      particleBatch.startTime % (256 * 256), // batch hash, mod 256^2
      particleBatch.lifeTime / 1000, // lifetime in seconds
      0, // padding

      particleBatch.gravity.x, // gravity x
      particleBatch.gravity.y, // gravity y
      particleBatch.gravity.z, // gravity z
      0, // padding

      particleBatch.v0.x, // vx
      particleBatch.v0.y, // vy
      particleBatch.v0.z, // vz
      0, // padding

      particleBatch.velocityVariance.x, // velocity variance x
      particleBatch.velocityVariance.y, // velocity variance y
      particleBatch.velocityVariance.z, // velocity variance z
      particleBatch.size, // size in pixels

      particleBatch.drag,
      particleBatch.angularDrag,
      particleBatch.spawnDuration / 1000, // spawn duration in seconds
      this.options.spawnSize * this.engine.pixelRatio,

      this.options.scaleWithAge, // padding
      particleBatch.omegaDistribution, // padding
      0, // padding
      0, // padding

      ...world.toData(),
      ...particleMatrix.toData(),
    ]);

    if (particleBufferData.length % 4 !== 0) {
      throw new Error('Particle buffer data length must be divisible by 4');
    }

    this.batches.push({ particleBatch, data: particleBufferData });
  }

  draw() {
    if (this.batches.length === 0 || !this.particleTexture) {
      return;
    }
    this.gl.useProgram(this.program);
    const currentTime = performance.now();
    const offset = 0;
    // bind noise texture
    const uNoiseTextureLocation = this.gl.getUniformLocation(this.program, 'uNoiseTexture');
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.noise);
    this.gl.uniform1i(uNoiseTextureLocation, 0); // Assign texture unit 0

    const uParticleTextureLocation = this.gl.getUniformLocation(this.program, 'uParticleTexture');

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.particleTexture);
    this.gl.uniform1i(uParticleTextureLocation, 1);

    for (let index = 0; index < this.batches.length; index++) {
      const particleBatch = this.batches[index].particleBatch;
      const startTime = particleBatch.startTime;
      const lifeTime = particleBatch.lifeTime;
      const age = currentTime - startTime;
      const vertexCount = particleBatch.count * 3;

      if (age > lifeTime + particleBatch.spawnDuration && !FREEZE_ON_MS) {
        // remove batch
        this.batches.splice(index, 1);
        index--;
        // this.batches[index].data[0] = 0;
        // this.batches[index].particleBatch.startTime = performance.now() % (256 * 256);
        // this.batches[index].data[1] = this.batches[index].particleBatch.startTime;

        continue;
      }

      this.batches[index].data[0] = (FREEZE_ON_MS ?? age) / 1000;

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
