import { Engine } from '../engine/engine';
import { Body } from '../entities';
import { Entity } from '../entities/entity/entity';
import { ObjectLoader } from '../loaders';
import { M4 } from '../m4';
import { Noise } from '../noise/noise';
import { SimplexNoise } from '../noise/simplex/simplexNoise';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';
import plane from './plane.obj?raw';
import type { EmitterOptions, ParticleBatchOptions, ParticleBatchProcessed } from './types';

export class Emitter extends Entity {
  private readonly particleBuffer: WebGLBuffer;
  private readonly noise: WebGLTexture;
  private readonly simplexNoise: WebGLTexture;
  /** 1x1 white texture used when no particle texture is set (keeps sampler valid). */
  private readonly whiteTexture: WebGLTexture;
  private particleTexture?: WebGLTexture;
  private atlasLayout: { rows: number; columns: number };
  private objects: {
    vao: WebGLVertexArrayObject;
    vertexCount: number;
  }[];

  private readonly uNoiseTexture: WebGLUniformLocation | null;
  private readonly uSimplexTexture: WebGLUniformLocation | null;
  private readonly uParticleTexture: WebGLUniformLocation | null;
  private readonly uBillboard: WebGLUniformLocation | null;
  private readonly uUseLighting: WebGLUniformLocation | null;
  private readonly uUseTexture: WebGLUniformLocation | null;
  private readonly uPixelRatio: WebGLUniformLocation | null;

  private batches: { particleBatch: ParticleBatchProcessed; id: number; data: Float32Array; startTime: number }[] = [];

  constructor(
    engine: Engine,
    private options: EmitterOptions,
  ) {
    super(engine, engine.createProgramFromShaders(emitterVertexShader, emitterFragmentShader));
    const gl = this.gl;

    this.atlasLayout = this.options.atlasLayout ?? { rows: 1, columns: 1 };

    const noise = new Noise(engine, 256);
    this.noise = noise.render();

    const simplex = new SimplexNoise(engine, { width: 256, height: 256, scale: 0.04, period: 2 });
    this.simplexNoise = simplex.render();

    const whiteTex = gl.createTexture();
    if (!whiteTex) throw new Error('Failed to create whiteTexture');
    this.whiteTexture = whiteTex;
    gl.bindTexture(gl.TEXTURE_2D, whiteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const particleBuffer = this.gl.createBuffer();
    if (!particleBuffer) {
      throw new Error('Failed to create particleBuffer');
    }
    this.particleBuffer = particleBuffer;
    gl.uniformBlockBinding(this.program, gl.getUniformBlockIndex(this.program, 'Emitter'), Engine.BindingPoints.Emitter);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, Engine.BindingPoints.Emitter, this.particleBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 72 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);

    this.particleTexture = options.texture;

    this.uNoiseTexture = gl.getUniformLocation(this.program, 'uNoiseTexture');
    this.uSimplexTexture = gl.getUniformLocation(this.program, 'uSimplexTexture');
    this.uParticleTexture = gl.getUniformLocation(this.program, 'uParticleTexture');
    this.uBillboard = gl.getUniformLocation(this.program, 'uBillboard');
    this.uUseLighting = gl.getUniformLocation(this.program, 'uUseLighting');
    this.uUseTexture = gl.getUniformLocation(this.program, 'uUseTexture');
    this.uPixelRatio = gl.getUniformLocation(this.program, 'uPixelRatio');

    const geometries = options.modelGeometries?.length ? options.modelGeometries : new ObjectLoader().parseOBJ(plane).geometries;

    this.objects = Body.createVAOs(engine, this.program, geometries).objects;
  }

  setTexture(texture: WebGLTexture | null | undefined) {
    this.particleTexture = texture ?? undefined;
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
      scale: options.scale ?? { x: 1, y: 1, z: 1 },
      velocityBias: options.velocityBias ?? { x: 0, y: 0, z: 0 },
      velocitySpread: options.velocitySpread ?? { x: 1, y: 1, z: 1 },
      spawnDuration: options.spawnDuration ?? 0,
      atlas: options.atlas ?? { offset: { column: 0, row: 0 } },
      scaleWithAge: options.scaleWithAge ?? 0,
      randomStartRotation: options.randomStartRotation ?? false,
      drag: options.Cd === 0 ? 0 : (options.Cd * options.density * options.area) / (2 * options.mass),
      angularDrag: options.Cr === 0 ? 0 : (options.Cr * options.density * options.area) / (2 * options.momentOfInertia),
      Ka: options.Ka ?? { r: 1, g: 1, b: 1 },
      Kd: options.Kd ?? { r: 1, g: 1, b: 1 },
      Ks: options.Ks ?? { r: 1, g: 1, b: 1 },
      Ns: options.Ns ?? 64,
      swayStrength: options.swayStrength ?? 200,
      swayTimeScale: options.swayTimeScale ?? 0.06,
    };
  }

  createBatch(options: ParticleBatchOptions, id: number, startTime: number) {
    const particleBatch = this.processParticleBatchOptions(options);
    // World position in logical (CSS) pixels; vertex shader scales by uPixelRatio for physical output
    const logicalHeight = this.engine.resolution.y / this.engine.pixelRatio;
    const world = M4.translation(particleBatch.origin.x, logicalHeight - particleBatch.origin.y, 0);

    // particle buffer data, structured using std140 layout
    const particleBufferData = new Float32Array([
      ...world.toData(),
      /* Time Block */
      0, // age in seconds, filled in draw method
      id, // batch hash, mod 256^2
      particleBatch.lifeTime / 1000, // lifetime in seconds
      0, // padding

      // vec3 and a padding byte
      particleBatch.gravity.x, // gravity x
      particleBatch.gravity.y, // gravity y
      particleBatch.gravity.z, // gravity z
      0, // padding

      // vec3 v0, vec3 velocitySpread (std140: each vec3 + padding)
      particleBatch.v0.x,
      particleBatch.v0.y,
      particleBatch.v0.z,
      0, // padding

      particleBatch.velocitySpread.x,
      particleBatch.velocitySpread.y,
      particleBatch.velocitySpread.z,
      0, // padding

      // vec3 velocityBias, float size
      particleBatch.velocityBias.x,
      particleBatch.velocityBias.y,
      particleBatch.velocityBias.z,
      particleBatch.size, // size in pixels

      // 4 floats
      particleBatch.drag,
      particleBatch.angularDrag,
      particleBatch.spawnDuration / 1000, // spawn duration in seconds
      particleBatch.spawnSize,

      particleBatch.scaleWithAge,
      particleBatch.omega0,
      this.atlasLayout.columns,
      this.atlasLayout.rows,

      // vec2, randomStartRotation (0/1), padding
      particleBatch.atlas.offset.column,
      particleBatch.atlas.offset.row,
      particleBatch.randomStartRotation ? 1 : 0,
      0, // padding

      // vec3 and a padding byte
      particleBatch.atlas?.sweep?.by !== 'column' ? 0 : 1,
      (particleBatch.atlas?.sweep?.stepTime ?? 0) / 1000,
      particleBatch.atlas?.sweep?.stepCount ?? 0,
      0, // padding

      // vec3 particleScaleVec (std140: vec3 + padding)
      particleBatch.scale.x,
      particleBatch.scale.y,
      particleBatch.scale.z,
      0, // padding

      // Material (std140: vec3 + float padding each, then float Ns)
      particleBatch.Ka.r,
      particleBatch.Ka.g,
      particleBatch.Ka.b,
      0, // padding

      particleBatch.Kd.r,
      particleBatch.Kd.g,
      particleBatch.Kd.b,
      0, // padding

      particleBatch.Ks.r,
      particleBatch.Ks.g,
      particleBatch.Ks.b,
      particleBatch.Ns,

      particleBatch.swayStrength,
      particleBatch.swayTimeScale,
      0,
      0,
    ]);

    const batch = { particleBatch, id, data: particleBufferData, startTime };
    return batch;
  }

  emit(options: ParticleBatchOptions) {
    const startTime = this.engine.now();
    const batch = this.createBatch(options, (startTime * (1 + Math.random())) % (256 * 256), startTime);
    this.batches.push(batch);
  }

  /** Apply new options to all existing batches, preserving each batch's origin. */
  updateBatches(options: ParticleBatchOptions) {
    for (let index = 0; index < this.batches.length; index++) {
      const batch = this.batches[index];
      const optionsWithBatchOrigin: ParticleBatchOptions = {
        ...options,
        origin: batch.particleBatch.origin,
      };
      this.batches[index] = this.createBatch(optionsWithBatchOrigin, batch.id, batch.startTime);
    }
  }

  hasActiveContent(): boolean {
    return this.batches.length > 0;
  }

  /** Remove and return all batches (e.g. before replacing this emitter). */
  takeBatches(): { particleBatch: ParticleBatchProcessed; id: number; data: Float32Array; startTime: number }[] {
    const b = this.batches;
    this.batches = [];
    return b;
  }

  /** Adopt batches from another emitter (e.g. after orientation switch). */
  receiveBatches(batches: { particleBatch: ParticleBatchProcessed; id: number; data: Float32Array; startTime: number }[]): void {
    this.batches = batches;
  }

  draw(time: number) {
    if (this.batches.length === 0) return;

    const gl = this.engine.gl;
    gl.useProgram(this.program);
    // bind noise texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.noise);
    gl.uniform1i(this.uNoiseTexture, 0);

    // bind simplex noise for sway (continuous tileable noise)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.simplexNoise);
    if (this.uSimplexTexture !== null) gl.uniform1i(this.uSimplexTexture, 1);

    // bind particle texture (1x1 white when none, so sampler is valid)
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.particleTexture ?? this.whiteTexture);
    gl.uniform1i(this.uParticleTexture, 2);

    gl.uniform1f(this.uBillboard, this.options.orientation === 'billboard' ? 1.0 : 0.0);
    gl.uniform1f(this.uUseLighting, this.options.useLighting !== false ? 1.0 : 0.0);
    if (this.uPixelRatio) gl.uniform1f(this.uPixelRatio, this.engine.pixelRatio);

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

      data[16] = age / 1000; // batchAge (world is 0–15)

      gl.uniform1f(this.uUseTexture, this.particleTexture ? 1.0 : 0.0);

      gl.bindBufferBase(gl.UNIFORM_BUFFER, Engine.BindingPoints.Emitter, this.particleBuffer);
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
