export class Particle {
  public startTime: number;
  public lifeTime: number;
  public count: number;
  public size: number;

  constructor(options: {
    lifeTime: number;
    count: number;
    size: number;
  }) {
    this.lifeTime = options.lifeTime;
    this.startTime = performance.now();
    this.count = options.count;
    this.size = options.size;
  }
}
