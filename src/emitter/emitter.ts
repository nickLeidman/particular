import type { Engine } from '../engine/engine';
import { M4 } from '../m4';
import { Noise } from '../noise/noise';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';
import emitterVertexShader2d from './emitterVertexShader2d.glsl';
import type { EmitterOptions, ParticleBatchOptions, ParticleBatchProcessed } from './types';
import { Entity } from '../entity/entity';

const EMITTER_BINDING_POINT = 1;

export class Emitter extends Entity {
  private readonly particleBuffer: WebGLBuffer;
  private noise: WebGLTexture;
  private particleTexture?: WebGLTexture;
  private atlasLayout: { rows: number; columns: number };

  private batches: { particleBatch: ParticleBatchProcessed; data: Float32Array; startTime: number }[] = [];

  constructor(
    engine: Engine,
    private options: EmitterOptions,
  ) {
    super(engine, engine.createProgramFromShaders(options.is2d ? emitterVertexShader2d : emitterVertexShader, emitterFragmentShader));

    this.atlasLayout = this.options.atlasLayout ?? { rows: 1, columns: 1 }

    const noise = new Noise(engine, 256);
    this.noise = noise.render();

    const particleBuffer = this.gl.createBuffer();
    if (!particleBuffer) {
      throw new Error('Failed to create particleBuffer');
    }
    this.particleBuffer = particleBuffer;
    this.gl.uniformBlockBinding(this.program, this.gl.getUniformBlockIndex(this.program, 'Emitter'), EMITTER_BINDING_POINT);
    this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, EMITTER_BINDING_POINT, this.particleBuffer);
    this.gl.bufferData(this.gl.UNIFORM_BUFFER, 44 * Float32Array.BYTES_PER_ELEMENT, this.gl.DYNAMIC_DRAW);

    this.particleTexture = options.texture;
  }

  processParticleBatchOptions(options: ParticleBatchOptions): ParticleBatchProcessed {
    return {
      ...options,
      aspectRatio: options.aspectRatio ?? 0,
      velocityBias: options.velocityBias ?? {x: 0, y: 0, z: 0},
      spawnDuration: options.spawnDuration ?? 0,
      atlasTextureOffset: options.atlasTextureOffset ?? {column: 0, row: 0},
      scaleWithAge: options.scaleWithAge ?? 0,
      drag: (options.Cd * options.density * options.area) / (2 * options.mass),
      angularDrag: (options.Cr * options.density * options.area) / (2 * options.momentOfInertia),
    }
  }

  async emit(options: ParticleBatchOptions) {
    const particleBatch = this.processParticleBatchOptions(options);
    const particleMatrix = M4.scaling(particleBatch.aspectRatio * this.engine.pixelRatio, this.engine.pixelRatio, this.engine.pixelRatio);
    const world = M4.translation(particleBatch.origin.x * this.engine.pixelRatio, particleBatch.origin.y * this.engine.pixelRatio, 0);
    const startTime = this.engine.now();

    // particle buffer data, structured using std140 layout
    const particleBufferData = new Float32Array([
      /* Time Block */
      0, // age in seconds, filled in draw method
      startTime % (256 * 256), // batch hash, mod 256^2
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

      particleBatch.velocityBias.x, // bias of velocity variance x
      particleBatch.velocityBias.y, // bias of velocity variance x
      particleBatch.velocityBias.z, // bias of velocity variance x
      particleBatch.size, // size in pixels

      particleBatch.drag,
      particleBatch.angularDrag,
      particleBatch.spawnDuration / 1000, // spawn duration in seconds
      particleBatch.spawnSize * this.engine.pixelRatio,

      particleBatch.scaleWithAge,
      particleBatch.omega0,
      this.atlasLayout.columns,
      this.atlasLayout.rows,

      particleBatch.atlasTextureOffset.column,
      particleBatch.atlasTextureOffset.row,
      0, // padding
      0, // padding

      ...world.toData(),
      ...particleMatrix.toData(),
    ]);

    if (particleBufferData.length % 4 !== 0) {
      throw new Error('Particle buffer data length must be divisible by 4');
    }

    this.batches.push({ particleBatch, data: particleBufferData, startTime });
  }

  draw(time: number) {
    const gl = this.engine.gl;
    if (this.batches.length === 0 || !this.particleTexture) {
      return;
    }
    gl.useProgram(this.program);
    const offset = 0;
    // bind noise texture
    const uNoiseTextureLocation = gl.getUniformLocation(this.program, 'uNoiseTexture');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noise);
    gl.uniform1i(uNoiseTextureLocation, 0); // Assign texture unit 0

    const uParticleTextureLocation = gl.getUniformLocation(this.program, 'uParticleTexture');

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particleTexture);
    gl.uniform1i(uParticleTextureLocation, 1);

    if (this.options.is2d) {
      gl.enable(gl.BLEND);
    }

    for (let index = 0; index < this.batches.length; index++) {
      const { particleBatch, startTime, data } = this.batches[index];
      const lifeTime = particleBatch.lifeTime;
      const age = time - startTime;
      const vertexCount = particleBatch.count * 3;

      if (age > lifeTime + particleBatch.spawnDuration) {
        // remove batch
        this.batches.splice(index, 1);
        index--;
        continue;
      }

      data[0] = age / 1000;

      gl.bindBufferBase(gl.UNIFORM_BUFFER, EMITTER_BINDING_POINT, this.particleBuffer);
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.particleBuffer);
      gl.bufferData(gl.UNIFORM_BUFFER, data, gl.DYNAMIC_DRAW);

      gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
    }

    if (this.options.is2d) {
      this.engine.resetBlend();
    }

    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }
}
