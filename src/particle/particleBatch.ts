export interface ParticleBatchOptions {
  lifeTime: number;
  count: number;
  size: number;
  aspectRatio: number;
  origin: { x: number; y: number };
  v0: { x: number; y: number; z: number };
  omegaDistribution: number;
  velocityVariance: { x: number; y: number; z: number };
  gravity: { x: number; y: number; z: number };
  spawnDuration: number;
  Cd: number;
  Cr: number;
  density: number;
  area: number;
  mass: number;
  momentOfInertia: number;
  textureImage?: string;
}

export class ParticleBatch {
  public lifeTime: number;
  public count: number;
  public size: number;
  public aspectRatio: number;
  public origin: { x: number; y: number };
  public v0: { x: number; y: number; z: number };
  public omegaDistribution: number;
  public velocityVariance: { x: number; y: number; z: number };
  public gravity: { x: number; y: number; z: number };
  public spawnDuration: number;
  public drag: number;
  public angularDrag: number;
  public textureImage?: string;

  constructor(options: ParticleBatchOptions) {
    this.lifeTime = options.lifeTime;
    this.count = options.count;
    this.size = options.size;
    this.aspectRatio = options.aspectRatio;
    this.origin = options.origin;
    this.v0 = options.v0;
    this.omegaDistribution = options.omegaDistribution;
    this.velocityVariance = options.velocityVariance;
    this.gravity = options.gravity;
    this.spawnDuration = options.spawnDuration;
    this.drag = (options.Cd * options.density * options.area) / (2 * options.mass);
    this.angularDrag = (options.Cr * options.density * options.area) / (2 * options.momentOfInertia);
    this.textureImage = options.textureImage;
  }
}
