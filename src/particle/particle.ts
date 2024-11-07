export class Particle {
  public startTime: number;
  public lifeTime: number;
  public count: number;
  public size: number;
  public origin: { x: number; y: number };
  public v0: number;

  constructor(options: {
    lifeTime: number;
    count: number;
    size: number;
    origin: { x: number; y: number };
    v0: number;
  }) {
    this.lifeTime = options.lifeTime;
    this.startTime = performance.now();
    this.count = options.count;
    this.size = options.size;
    this.origin = options.origin;
    this.v0 = options.v0;
  }
}
