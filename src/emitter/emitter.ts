import type { Engine } from '../engine/engine';
import { M3 } from '../m3';
import { Particle } from '../particle/particle';
import type { Vec2 } from '../vec2';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';

export enum EmitterUniforms {
  Resolution = 'u_resolution',
  Time = 'u_time',
  Gravity = 'u_gravity',
  LocalOffset = 'u_localOffset',
  Projection = 'u_projection',
  Start = 'u_start',
  Lifetime = 'u_lifetime',
}

export class Emitter {
  private readonly gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private uniformLocations: Record<keyof typeof EmitterUniforms, WebGLUniformLocation | null> | undefined;
  private gravity = 0;
  private size = 24;
  private startTime = performance.now();
  private particleCount = 2_000;

  private batches: Particle[] = [];

  constructor(private engine: Engine) {
    this.engine = engine;
    this.gl = engine.gl;

    window.addEventListener('click', () => {
      this.batches.push(
        new Particle({
          lifeTime: 2000,
        }),
      );
    });

    this.initShaders();
  }

  // Create an emitter program.
  initShaders() {
    const gl = this.gl;
    const vertexShader = this.engine.createShader(gl.VERTEX_SHADER, emitterVertexShader);
    const fragmentShader = this.engine.createShader(gl.FRAGMENT_SHADER, emitterFragmentShader);
    const program = this.engine.createProgramFromShaders(vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create program');
    }

    this.program = program;

    this.uniformLocations = {
      Resolution: gl.getUniformLocation(program, EmitterUniforms.Resolution),
      Time: gl.getUniformLocation(program, EmitterUniforms.Time),
      Gravity: gl.getUniformLocation(program, EmitterUniforms.Gravity),
      LocalOffset: gl.getUniformLocation(program, EmitterUniforms.LocalOffset),
      Projection: gl.getUniformLocation(program, EmitterUniforms.Projection),
      Start: gl.getUniformLocation(program, EmitterUniforms.Start),
      Lifetime: gl.getUniformLocation(program, EmitterUniforms.Lifetime),
    };
  }

  update(deltaTime: number) {
    if (!this.program || !this.uniformLocations) {
      return;
    }
    this.gl.useProgram(this.program);
    this.engine.resetViewport();
    this.draw();
  }

  draw() {
    if (!this.program || !this.uniformLocations) {
      return;
    }
    for (let index = 0; index < this.batches.length; index++) {
      const startTime = this.batches[index].startTime;
      const lifeTime = this.batches[index].lifeTime;
      const currentTime = performance.now();
      const elapsedTime = currentTime - startTime;
      if (elapsedTime > lifeTime) {
        // remove batch
        this.batches.splice(index, 1);
        continue;
      }
      this.gl.uniform1fv(this.uniformLocations.Start, [startTime]);
      this.gl.uniform1fv(this.uniformLocations.Time, [elapsedTime]);
      this.gl.uniform1fv(this.uniformLocations.Lifetime, [lifeTime]);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, this.particleCount * 3);
    }
  }

  setup(projection: M3, resolution: Vec2) {
    if (!this.program || !this.uniformLocations) {
      return;
    }
    const gl = this.gl;
    gl.useProgram(this.program);

    // gl.activeTexture(gl.TEXTURE0);  // Activate texture unit 0
    // gl.bindTexture(gl.TEXTURE_2D, candyTexture);  // Bind the texture
    // gl.uniform1i(u_textureLocation, 0);  // Set the sampler to use texture unit 0

    gl.uniform2f(this.uniformLocations.Resolution, resolution.x, resolution.y);
    gl.uniform1fv(this.uniformLocations.Time, [this.startTime / 1000]);
    gl.uniform2f(this.uniformLocations.Gravity, 0, this.gravity);

    const particleCenter = M3.translation(-this.size * (1 / 4), -this.size * (3 / 4));
    gl.uniformMatrix3fv(this.uniformLocations.LocalOffset, false, particleCenter.value);
    gl.uniformMatrix3fv(this.uniformLocations.Projection, false, projection.value);
  }
}
