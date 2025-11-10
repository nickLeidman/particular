import type { Engine } from '../../engine/engine';
import type { Geometry } from '../../loaders/objectLoader/types';
import { M4 } from '../../m4';
import { Vec3 } from '../../vec3';
import { Entity } from '../entity/entity';
import bodyFragmentShader from './bodyFragmentShader.glsl';
import bodyVertexShader from './bodyVertexShader.glsl';

export class Body extends Entity {
  objects: {
    vao: WebGLVertexArrayObject;
    vertexCount: number;
  }[];
  uniformWorldLocation: WebGLUniformLocation;

  constructor(engine: Engine, geometries: Geometry[]) {
    const gl = engine.gl;
    const program = engine.createProgramFromShaders(bodyVertexShader, bodyFragmentShader);

    super(engine, program);

    const uniformWorldLocation = gl.getUniformLocation(program, 'uWorld');
    if (!uniformWorldLocation) {
      throw new Error('Failed to get uniform location');
    }

    this.objects = Body.createVAOs(engine, program, geometries).objects;
    this.uniformWorldLocation = uniformWorldLocation;
  }

  draw(time: number): void {
    const gl = this.gl;

    gl.enable(gl.CULL_FACE);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(
      this.uniformWorldLocation,
      false,
      M4.multiply(
        M4.multiply(M4.translation(this.engine.resolution.x / 2, this.engine.resolution.y / 2 + -600, 0), M4.rotationY(time / 600)),
        M4.scaling(200, 200, 200),
      ).toData(),
    );

    const reverseLightDirectionLocation = gl.getUniformLocation(this.program, 'uReverseLightDirection');
    gl.uniform3fv(reverseLightDirectionLocation, new Vec3(0, 0, 1).normalize().value);

    this.objects.forEach(({ vao, vertexCount }) => {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    });

    gl.bindVertexArray(null);
  }

  static createVAOs(
    engine: Engine,
    program: WebGLProgram,
    geometries: Geometry[],
  ): {
    objects: {
      vao: WebGLVertexArrayObject;
      vertexCount: number;
    }[];
  } {
    const objects: {
      vao: WebGLVertexArrayObject;
      vertexCount: number;
    }[] = [];

    const gl = engine.gl;

    geometries.forEach((geometry) => {
      const { position, normal, texcoord } = geometry.data;

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW);
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal), gl.STATIC_DRAW);
      const texcoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoord), gl.STATIC_DRAW);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      const positionLocation = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      const normalLocation = gl.getAttribLocation(program, 'aNormal');
      gl.enableVertexAttribArray(normalLocation);
      gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
      const texcoordLocation = gl.getAttribLocation(program, 'aTexcoord');
      gl.enableVertexAttribArray(texcoordLocation);
      gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

      gl.bindVertexArray(null);

      objects.push({ vao, vertexCount: position.length / 3 });
    });

    return {
      objects,
    };
  }
}
