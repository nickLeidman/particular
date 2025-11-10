export class Vec3 {
  public value: number[];
  constructor(
    public x: number,
    public y: number,
    public z: number,
  ) {
    this.value = [x, y, z];
  }

  add(v: Vec3) {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  substract(v: Vec3) {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(scale: number) {
    return new Vec3(this.x * scale, this.y * scale, this.z * scale);
  }

  multiply(v: Vec3) {
    return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  divide(v: Vec3) {
    return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize() {
    const len = this.length();
    return new Vec3(this.x / len, this.y / len, this.z / len);
  }

  static random() {
    return new Vec3(Math.random(), Math.random(), Math.random());
  }
}
