import { Vec3 } from '../vec3';

/**
 * Light source for a scene. Use setColor and setPosition to update; optional onChange
 * callback is invoked so the scene can refresh entity setup (e.g. scene.refreshEntitySetup).
 */
export class Light {
  private _position: Vec3;
  private _color: Vec3;
  private readonly onChange?: () => void;

  constructor(options?: { position?: Vec3; color?: Vec3; onChange?: () => void }) {
    this._position = options?.position ?? new Vec3(0, 0, 10000);
    this._color = options?.color ?? new Vec3(0.8, 0.8, 0.8);
    this.onChange = options?.onChange;
  }

  get position(): Vec3 {
    return this._position;
  }

  get color(): Vec3 {
    return this._color;
  }

  setColor(r: number, g: number, b: number) {
    this._color.r = r;
    this._color.g = g;
    this._color.b = b;
    this.onChange?.();
  }

  setPosition(x: number, y: number, z: number) {
    this._position = new Vec3(x, y, z);
    this.onChange?.();
  }
}
