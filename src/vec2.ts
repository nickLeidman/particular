export class Vec2 {
  public value: number[];
  constructor(
    public x: number,
    public y: number,
  ) {
    this.value = [x, y];
  }

  add(v: Vec2) {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  substract(v: Vec2) {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(scale: number) {
    return new Vec2(this.x * scale, this.y * scale);
  }

  multiply(v: Vec2) {
    return new Vec2(this.x * v.x, this.y * v.y);
  }

  divide(v: Vec2) {
    return new Vec2(this.x / v.x, this.y / v.y);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const len = this.length();
    return new Vec2(this.x / len, this.y / len);
  }

  static fromAngle(angle: number) {
    return new Vec2(Math.cos(angle), Math.sin(angle));
  }

  static random() {
    return new Vec2(Math.random(), Math.random());
  }

  static randomUnit() {
    return Vec2.fromAngle(Math.random() * Math.PI * 2);
  }
}
