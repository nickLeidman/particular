import { M4 } from '../m4';
import { Vec3 } from '../vec3';
import type { Engine } from '../engine/engine';

export class Camera {
  projection!: M4;
  view!: M4;
  viewPosition!: Vec3;

  private onUpdateCallbacks: (() => void)[] = [];

  constructor(
    private engine: Engine,
    private type: 'orthographic' | 'perspective',
    private distance: number,
  ) {
    this.update();
  }

  update() {
    const resolution = this.engine.resolution;
    const distance = this.distance * this.engine.pixelRatio;
    if (this.type === 'orthographic') {
      const longestDimension = Math.max(resolution.x, resolution.y);
      this.projection = M4.orthographic(0, resolution.x, 0, resolution.y, 0.1, longestDimension * 2);
      this.view = M4.translation(0, 0, -longestDimension);
      // View/camera (and thus scene light) in front of the scene so lighting matches perspective
      this.viewPosition = new Vec3(resolution.x / 2, resolution.y / 2, longestDimension);
    } else {
      const fieldOfViewInRadians = 2 * Math.atan(resolution.y / 2 / distance);
      this.projection = M4.perspective(fieldOfViewInRadians, resolution.x / resolution.y, 100, distance * 2);
      this.view = M4.translation(-resolution.x / 2, -resolution.y / 2, -distance);
      this.viewPosition = new Vec3(resolution.x / 2, resolution.y / 2, distance);
    }
    for (const callback of this.onUpdateCallbacks) {
      callback();
    }
  }

  setDistance(distance: number) {
    this.distance = distance;
    this.update();
  }

  setType(type: 'orthographic' | 'perspective') {
    this.type = type;
    this.update();
  }

  onUpdate(callback: () => void) {
    this.onUpdateCallbacks.push(callback);
  }
}
