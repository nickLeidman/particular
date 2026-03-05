import type { Engine } from '../engine/engine';
import { Body } from '../entities';
import { Entity } from '../entities/entity/entity';
import { ObjectLoader } from '../loaders';
import { M4 } from '../m4';
import { Noise } from '../noise/noise';
import { Vec3 } from '../vec3';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';
import plane from './plane.obj?raw';
import type { EmitterOptions, ParticleBatchOptions, ParticleBatchProcessed } from './types';

const EMITTER_BINDING_POINT = 1;

export class Emitter extends Entity {
  private readonly particleBuffer: WebGLBuffer;
  private readonly noise: WebGLTexture;
  private particleTexture?: WebGLTexture;
  private atlasLayout: { rows: number; columns: number };
  private objects: {
    vao: WebGLVertexArrayObject;
    vertexCount: number;
  }[];

  private readonly uNoiseTexture: WebGLUniformLocation | null;
  private readonly uParticleTexture: WebGLUniformLocation | null;
  private readonly uBillboard: WebGLUniformLocation | null;
  private readonly uUseLighting: WebGLUniformLocation | null;
  private readonly uLightPosition: WebGLUniformLocation | null;

  private batches: { particleBatch: ParticleBatchProcessed; data: Float32Array; startTime: number }[] = [];

  constructor(
    engine: Engine,
    private options: EmitterOptions,
  ) {
    super(engine, engine.createProgramFromShaders(emitterVertexShader, emitterFragmentShader));
    const gl = this.gl;

    this.atlasLayout = this.options.atlasLayout ?? { rows: 1, columns: 1 };

    const noise = new Noise(engine, 256);
    this.noise = noise.render();

    const particleBuffer = this.gl.createBuffer();
    if (!particleBuffer) {
      throw new Error('Failed to create particleBuffer');
    }
    this.particleBuffer = particleBuffer;
    gl.uniformBlockBinding(this.program, gl.getUniformBlockIndex(this.program, 'Emitter'), EMITTER_BINDING_POINT);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, EMITTER_BINDING_POINT, this.particleBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 44 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);

    this.particleTexture = options.texture;

    this.uNoiseTexture = gl.getUniformLocation(this.program, 'uNoiseTexture');
    this.uParticleTexture = gl.getUniformLocation(this.program, 'uParticleTexture');
    this.uBillboard = gl.getUniformLocation(this.program, 'uBillboard');
    this.uUseLighting = gl.getUniformLocation(this.program, 'uUseLighting');
    this.uLightPosition = gl.getUniformLocation(this.program, 'uLightPosition');

    const geometries = options.modelGeometries?.length ? options.modelGeometries : new ObjectLoader().parseOBJ(plane).geometries;

    this.objects = Body.createVAOs(engine, this.program, geometries).objects;
  }

  setTexture(texture: WebGLTexture) {
    this.particleTexture = texture;
  }

  setUseLighting(use: boolean) {
    this.options.useLighting = use;
  }

  setUseAlphaBlending(use: boolean) {
    this.options.useAlphaBlending = use;
  }

  processParticleBatchOptions(options: ParticleBatchOptions): ParticleBatchProcessed {
    return {
      ...options,
      aspectRatio: options.aspectRatio ?? 0,
      velocityBias: options.velocityBias ?? { x: 0, y: 0, z: 0 },
      spawnDuration: options.spawnDuration ?? 0,
      atlas: options.atlas ?? { offset: { column: 0, row: 0 } },
      scaleWithAge: options.scaleWithAge ?? 0,
      drag: (options.Cd * options.density * options.area) / (2 * options.mass),
      angularDrag: (options.Cr * options.density * options.area) / (2 * options.momentOfInertia),
    };
  }

  async emit(options: ParticleBatchOptions) {
    const particleBatch = this.processParticleBatchOptions(options);
    const world = M4.translation(
      particleBatch.origin.x * this.engine.pixelRatio,
      this.engine.resolution.y - particleBatch.origin.y * this.engine.pixelRatio,
      0,
    );
    const startTime = this.engine.now();

    // particle buffer data, structured using std140 layout
    const particleBufferData = new Float32Array([
      /* Time Block */
      0, // age in seconds, filled in draw method
      (startTime * (1 + Math.random())) % (256 * 256), // batch hash, mod 256^2
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

      particleBatch.atlas.offset.column,
      particleBatch.atlas.offset.row,
      0, // padding
      0, // padding

      particleBatch.atlas?.sweep?.by !== 'column' ? 0 : 1,
      (particleBatch.atlas?.sweep?.stepTime ?? 0) / 1000,
      particleBatch.atlas?.sweep?.stepCount ?? 0,
      0, // padding

      ...world.toData(),
    ]);

    if (particleBufferData.length % 4 !== 0) {
      throw new Error('Particle buffer data length must be divisible by 4');
    }

    this.batches.push({ particleBatch, data: particleBufferData, startTime });
  }

  draw(time: number) {
    if (!this.particleTexture || this.batches.length === 0) return;
    const gl = this.engine.gl;
    gl.useProgram(this.program);
    // bind noise texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noise);
    gl.uniform1i(this.uNoiseTexture, 0);

    // bind particle texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.particleTexture);
    gl.uniform1i(this.uParticleTexture, 1);

    gl.uniform1f(this.uBillboard, this.options.orientation === 'billboard' ? 1.0 : 0.0);
    gl.uniform1f(this.uUseLighting, this.options.useLighting !== false ? 1.0 : 0.0);
    gl.uniform3fv(this.uLightPosition, new Vec3(this.engine.resolution.x / 2, this.engine.resolution.y / 2, 10000).value);

    const useAlphaBlending = this.options.useAlphaBlending !== false;
    const blendWasEnabled = gl.isEnabled(gl.BLEND);
    const blendSrc = gl.getParameter(gl.BLEND_SRC_RGB);
    const blendDst = gl.getParameter(gl.BLEND_DST_RGB);
    const depthTestWasEnabled = gl.isEnabled(gl.DEPTH_TEST);
    if (useAlphaBlending) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.BLEND);
    }

    for (let index = 0; index < this.batches.length; index++) {
      const { particleBatch, startTime, data } = this.batches[index];
      const lifeTime = particleBatch.lifeTime;
      const age = time - startTime;

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

      this.objects.forEach(({ vao, vertexCount }) => {
        gl.bindVertexArray(vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, particleBatch.count);
      });
    }

    if (blendWasEnabled) {
      gl.enable(gl.BLEND);
      gl.blendFunc(blendSrc, blendDst);
    } else {
      gl.disable(gl.BLEND);
    }
    if (depthTestWasEnabled) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }

    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }
}
