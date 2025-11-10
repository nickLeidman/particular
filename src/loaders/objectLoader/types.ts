export interface ObjectInfo {
  position: number[];
  texcoord: number[];
  normal: number[];
}

export interface Geometry {
  material: string;
  object: string;
  groups: string[];
  data: ObjectInfo;
}
