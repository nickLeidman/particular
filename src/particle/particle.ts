export class Particle {
  public startTime: number;
  public lifeTime: number;
  public count: number;
  public size: number;
  public origin: { x: number; y: number };
  public v0: number;
  public gravity: { x: number; y: number; z: number };
  public spawnDuration: number;
  public drag: number;
  public angularDrag: number;

  constructor(options: {
    lifeTime: number;
    count: number;
    size: number;
    origin: { x: number; y: number };
    v0: number;
    gravity: { x: number; y: number; z: number };
    spawnDuration: number;
    Cd: number;
    Cr: number;
    density: number;
    area: number;
    mass: number;
    momentOfInertia: number;
  }) {
    this.lifeTime = options.lifeTime;
    this.startTime = performance.now();
    this.count = options.count;
    this.size = options.size;
    this.origin = options.origin;
    this.v0 = options.v0;
    this.gravity = options.gravity;
    this.spawnDuration = options.spawnDuration;
    this.drag = (options.Cd * options.density * options.area) / (2 * options.mass);
    this.angularDrag = (options.Cr * options.density * options.area) / (2 * options.momentOfInertia);
  }
}
