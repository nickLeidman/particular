export class Particle {
  public startTime: number;
  public lifeTime: number;

  constructor(options: {
    lifeTime: number;
  }) {
    this.lifeTime = options.lifeTime;
    this.startTime = performance.now();
  }
}
