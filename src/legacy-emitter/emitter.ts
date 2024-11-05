import type { Engine } from '../engine/engine';
import { M3 } from '../m3';
import { Vec2 } from '../vec2';
import emitterFragmentShader from './emitterFragmentShader.glsl';
import emitterVertexShader from './emitterVertexShader.glsl';

export enum EmitterUniforms {
  Resolution = 'u_resolution',
  Time = 'u_time',
  Gravity = 'u_gravity',
  LocalOffset = 'u_localOffset',
  Projection = 'u_projection',
  Texture = 'u_texture',
}

export enum EmitterAttributes {
  Position = 'a_position',
  Velocity = 'a_velocity',
  AngularVelocity = 'a_angularVelocity',
  Scale = 'a_scale',
  Color = 'a_color',
  Texture = 'a_texCoord',
  Lifetime = 'a_lifetime',
}

export class LegacyEmitter {
  private readonly gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private uniformLocations: Record<keyof typeof EmitterUniforms, WebGLUniformLocation | null> | undefined;
  private attributeLocations: Record<keyof typeof EmitterAttributes, number> | undefined;
  private gravity = 10;
  private size = 24;
  private startTime = performance.now();
  private particleCount = 20_000;
  private particleBuffer: WebGLBuffer | null = null;

  constructor(private engine: Engine) {
    this.engine = engine;
    this.gl = engine.gl;

    this.initShaders();
    this.initBuffers();
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
      Texture: gl.getUniformLocation(program, EmitterUniforms.Texture),
    };

    this.attributeLocations = {
      Position: gl.getAttribLocation(program, EmitterAttributes.Position),
      Velocity: gl.getAttribLocation(program, EmitterAttributes.Velocity),
      AngularVelocity: gl.getAttribLocation(program, EmitterAttributes.AngularVelocity),
      Scale: gl.getAttribLocation(program, EmitterAttributes.Scale),
      Color: gl.getAttribLocation(program, EmitterAttributes.Color),
      Texture: gl.getAttribLocation(program, EmitterAttributes.Texture),
      Lifetime: gl.getAttribLocation(program, EmitterAttributes.Lifetime),
    };
  }

  initBuffers() {
    if (!this.program || !this.attributeLocations || !this.uniformLocations) {
      return;
    }
    const gl = this.gl;
    // Array to store particle data (position and velocity for each particle)
    const particleData = [];

    const IMPULSE = 100;
    const ROTATION = 30;

    const particleTriangle = [
      { position: new Vec2(0, 0), uv: new Vec2(0, -1) },
      { position: new Vec2(0, this.size), uv: new Vec2(0, 1) },
      { position: new Vec2(this.size, this.size), uv: new Vec2(2, 1) },
    ];

    // Fill the array with random positions and velocities
    for (let i = 0; i < this.particleCount; i++) {
      // Random initial position (x, y)
      const startingPosition = new Vec2(0, 0);

      // Random initial velocity (x, y)
      const direction = Vec2.randomUnit();
      const randomImpulseScale = Math.random();
      const velocity = direction.scale(IMPULSE * randomImpulseScale);
      // Random angular velocity
      const angularVelocity = ROTATION * 2 * (Math.random() - 0.5);

      const color = [Math.random(), Math.random(), Math.random()];

      const randomScale = Math.random() + 0.5;

      // Create the triangle by repeating the same velocity and color for each of the 3 vertices
      for (let j = 0; j < 3; j++) {
        // Add the initial position (same for all triangle vertices)
        const pointPosition = startingPosition.add(particleTriangle[j].position);
        particleData.push(pointPosition.x, pointPosition.y);

        // Add the velocity (same for all vertices of the triangle)
        particleData.push(velocity.x, velocity.y);

        // Add the angular velocity (same for all vertices of the triangle)
        particleData.push(angularVelocity);

        // Add the scale (same for all vertices of the triangle)
        particleData.push(randomScale);

        // Add the color (same for all vertices of the triangle)
        particleData.push(color[0], color[1], color[2]);

        // Add the UV coordinates
        particleData.push(particleTriangle[j].uv.x, particleTriangle[j].uv.y);
      }
    }

    // Create a buffer to store the particle data
    this.particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particleData), gl.STATIC_DRAW);
    const particleSize = 11 * Float32Array.BYTES_PER_ELEMENT;

    gl.enableVertexAttribArray(this.attributeLocations.Position);
    gl.enableVertexAttribArray(this.attributeLocations.Velocity);
    gl.enableVertexAttribArray(this.attributeLocations.AngularVelocity);
    gl.enableVertexAttribArray(this.attributeLocations.Scale);
    gl.enableVertexAttribArray(this.attributeLocations.Color);
    gl.enableVertexAttribArray(this.attributeLocations.Texture);

    // Set up the attributes: position (first 2 floats), velocity (next 2 floats), color (last 3 floats)
    gl.vertexAttribPointer(this.attributeLocations.Position, 2, gl.FLOAT, false, particleSize, 0); // Position is first 2 floats
    gl.vertexAttribPointer(this.attributeLocations.Velocity, 2, gl.FLOAT, false, particleSize, 2 * Float32Array.BYTES_PER_ELEMENT); // Velocity is next 2 floats
    gl.vertexAttribPointer(this.attributeLocations.AngularVelocity, 1, gl.FLOAT, false, particleSize, 4 * Float32Array.BYTES_PER_ELEMENT); // Angular velocity is next float
    gl.vertexAttribPointer(this.attributeLocations.Scale, 1, gl.FLOAT, false, particleSize, 5 * Float32Array.BYTES_PER_ELEMENT); // Scale is next float
    gl.vertexAttribPointer(this.attributeLocations.Color, 3, gl.FLOAT, false, particleSize, 6 * Float32Array.BYTES_PER_ELEMENT); // Color is last 3 floats
    gl.vertexAttribPointer(this.attributeLocations.Texture, 2, gl.FLOAT, false, particleSize, 9 * Float32Array.BYTES_PER_ELEMENT); // UV is last 2 floats
  }

  update(deltaTime: number) {
    if (!this.program || !this.uniformLocations || !this.attributeLocations) {
      return;
    }
    this.gl.useProgram(this.program);
    this.gl.uniform1fv(this.uniformLocations.Time, [performance.now() / 1000 - this.startTime / 1000]);
    this.engine.resetViewport();
    this.draw();
  }

  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.particleCount * 3);
  }

  setup(projection: M3, resolution: Vec2) {
    if (!this.program || !this.uniformLocations || !this.attributeLocations) {
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
