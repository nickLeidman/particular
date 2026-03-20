import type { Geometry } from './types';

const OBJ_KEYWORD_REGEX = /(\w*)(?: )*(.*)/;

export class ObjectLoader {
  parseOBJ(obj: string): { geometries: Geometry[]; materialLibs: string[] } {
    const objPositions = [[0, 0, 0]];
    const objTexcoords = [[0, 0]];
    const objNormals = [[0, 0, 0]];

    const objVertexData = [objPositions, objTexcoords, objNormals];

    let webglVertexData: [number[], number[], number[]] = [
      [], // positions
      [], // texcoords
      [], // normals
    ];

    const materialLibs: string[] = [];

    const geometries: Geometry[] = [];
    let geometry: Geometry | undefined;
    let material = 'default';
    let object = 'default';
    let groups = ['default'];

    function newGeometry() {
      // If there is an existing geometry and it's
      // not empty then start a new one.
      if (geometry?.data.position.length) {
        geometry = undefined;
      }
    }

    function setGeometry() {
      if (!geometry) {
        const position: number[] = [];
        const texcoord: number[] = [];
        const normal: number[] = [];
        webglVertexData = [position, texcoord, normal];
        geometry = {
          material,
          object,
          groups,
          data: {
            position,
            texcoord,
            normal,
          },
        };
        geometries.push(geometry);
      }
    }

    function addVertex(vert: string) {
      const ptn = vert.split('/');
      ptn.forEach((objIndexStr, i) => {
        if (!objIndexStr) {
          return;
        }
        const objIndex = parseInt(objIndexStr);
        const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
        webglVertexData[i].push(...objVertexData[i][index]);
      });
    }

    const keywords: Record<string, (parts: string[], unparsedArgs: string) => void> = {
      v(parts: string[]) {
        objPositions.push(parts.map(parseFloat));
      },
      vn(parts: string[]) {
        objNormals.push(parts.map(parseFloat));
      },
      vt(parts: string[]) {
        // OBJ may provide 2 or 3 components (u v [w]); WebGL attribute uses vec2.
        // Flip V to match how textures are uploaded in WebGL (top-left image origin).
        const u = parseFloat(parts[0] ?? '0');
        const v = parseFloat(parts[1] ?? '0');
        objTexcoords.push([u, 1 - v]);
      },
      f(parts: string[]) {
        setGeometry();
        const numTriangles = parts.length - 2;
        for (let tri = 0; tri < numTriangles; ++tri) {
          addVertex(parts[0]);
          addVertex(parts[tri + 1]);
          addVertex(parts[tri + 2]);
        }
      },
      usemtl(_parts: string[], unparsedArgs) {
        material = unparsedArgs;
        newGeometry();
      },
      mtllib(_parts, unparsedArgs) {
        materialLibs.push(unparsedArgs);
      },
      o(_parts, unparsedArgs) {
        object = unparsedArgs;
        newGeometry();
      },
      g(parts) {
        groups = parts;
        newGeometry();
      },
    };

    const lines = obj.split('\n');
    for (let line of lines) {
      line = line.trim();

      let parts = line.split(/\s+/);

      const match = OBJ_KEYWORD_REGEX.exec(line);
      if (!match) continue;

      const [, keyword, unparsedArgs] = match;
      parts = parts.slice(1);
      keywords[keyword]?.(parts, unparsedArgs);
    }

    return {
      materialLibs,
      geometries,
    };
  }
}
