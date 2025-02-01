export interface ParticleBatchOptions {
  lifeTime: number;
  count: number;
  size: number;
  origin: { x: number; y: number };
  v0: { x: number; y: number; z: number };
  velocityVariance: { x: number; y: number; z: number };
  gravity: { x: number; y: number; z: number };
  spawnDuration: number;
  Cd: number;
  Cr: number;
  density: number;
  area: number;
  mass: number;
  momentOfInertia: number;
}

export class ParticleBatch {
  public startTime: number;
  public lifeTime: number;
  public count: number;
  public size: number;
  public origin: { x: number; y: number };
  public v0: { x: number; y: number; z: number };
  public velocityVariance: { x: number; y: number; z: number };
  public gravity: { x: number; y: number; z: number };
  public spawnDuration: number;
  public drag: number;
  public angularDrag: number;

  constructor(options: ParticleBatchOptions) {
    this.lifeTime = options.lifeTime;
    this.startTime = performance.now();
    this.count = options.count;
    this.size = options.size;
    this.origin = options.origin;
    this.v0 = options.v0;
    this.velocityVariance = options.velocityVariance;
    this.gravity = options.gravity;
    this.spawnDuration = options.spawnDuration;
    this.drag = (options.Cd * options.density * options.area) / (2 * options.mass);
    this.angularDrag = (options.Cr * options.density * options.area) / (2 * options.momentOfInertia);
  }
}
