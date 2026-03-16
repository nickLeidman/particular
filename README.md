# Particular

> Words of caution: **this is a work in progress**.
> 
> Please be aware that some APIs may change, and some functionality may not be implemented yet.


Particular is a simple library for rendering particle effects.
It uses WebGL2 and supports running in workers.

## Installing

To install the library, run:
```
npm install particular
```

## Usage

Basic setup of a particle system:

```ts
import { Engine, Emitter, Scene, TextureLoader } from 'particular';

const engine = new Engine(canvas, { x: window.innerWidth, y: window.innerHeight });

const scene = new Scene(engine);

const emitter = new Emitter(engine, { texture: texture, orientation: 'billboard' });

scene.add(emitter);

engine.addScene(scene);

engine.start();

emitter.emit({
  // particle batch options
});
```

### Particle Batch Options

```ts 
export interface ParticleBatchOptions {
  /** Lifetime of a particle batch in **ms**, batch will be disposed of after `lifeTime` + `spawnDuration` */
  lifeTime: number;
  /** Number of particles in the batch */
  count: number;
  /** Size of a particle in **pixels** */
  size: number;
  /**
   * Per-axis scale of the particle (applied with size).
   * @default { x: 1, y: 1, z: 1 }
   */
  scale?: { x: number; y: number; z: number };
  /** Origin of the particle in **pixels**, relative to the top left corner*/
  origin: { x: number; y: number };
  /** Initial velocity of the particle in **pixels/s**. Each particle gets a random velocity in [bias·v0 − spread·v0, bias·v0 + spread·v0] per axis; see `velocityBias` and `velocitySpread`. */
  v0: { x: number; y: number; z: number };
  /**
   * Velocity bias of a particle in fractions of `v0` for each axis (shifts the center of the random range).
   * For example, if v0 is 10 px/s and velocity bias is 0, particle velocity will be between -10 and 10 px/s.
   * If velocity bias is 0.5, particle velocity will be between -5 and 15 px/s (with velocitySpread 1).
   *
   * @default { x: 0, y: 0, z: 0 }
   */
  velocityBias?: { x: number; y: number; z: number };
  /**
   * Per-axis fraction of the full velocity range used for random spread. 1 = full range; 0.5 = half spread; 0 = no spread.
   * @default { x: 1, y: 1, z: 1 }
   */
  velocitySpread?: { x: number; y: number; z: number };
  /**
   * Initial angular velocity of the particle in **radians/s**.
   * Each particle in a batch will receive a random velocity between `-omega0` and `omega0`.
   */
  omega0: number;
  /** Gravity of the particle batch in **pixels/s^2** */
  gravity: { x: number; y: number; z: number };
  /**
   * Period of time during which particles will spawn. In **ms**
   * @default 0
   */
  spawnDuration?: number;
  /** Drag coefficient of a particle. Used for fluid simulation */
  Cd: number;
  /** Angular drag coefficient of a particle. Used for fluid simulation */
  Cr: number;
  /** Density of a fluid the particle is moving through. In **kg/kpx^3**. Used for fluid simulation */
  density: number;
  /** Cross-sectional area of a particle. In **px^2**. Used for fluid simulation */
  area: number;
  /** Mass of a particle. In **kg**. Used for fluid simulation */
  mass: number;
  /** Moment of inertia of a particle. In **kg*px^2**. Used for fluid simulation */
  momentOfInertia: number;
  /**
   * Offset of the texture in the atlas
   * @default { column: 0, row: 0 }
   */
  atlasTextureOffset: { column: number; row: number };
  /**
   * Amount of scaling applied to a particle based on its age.
   * @default 0
   */
  scaleWithAge: number;
  /**
   * Diameter of a spawn area in **pixels**.
   * */
  spawnSize: number;
  /**
   * Phong-style material (ambient, diffuse, specular color and shininess).
   * When the emitter has a texture, Ka and Kd are taken from the texture; Ks and Ns always come from the batch.
   * RGB values in [0, 1]; Ns (shininess) typically 1–256.
   */
  /** Ambient color. @default { r: 1, g: 1, b: 1 } */
  Ka?: { r: number; g: number; b: number };
  /** Diffuse color. @default { r: 1, g: 1, b: 1 } */
  Kd?: { r: number; g: number; b: number };
  /** Specular color (use { r:0, g:0, b:0 } for no specular). @default { r: 1, g: 1, b: 1 } */
  Ks?: { r: number; g: number; b: number };
  /** Specular exponent (shininess). @default 64 */
  Ns?: number;
}
```
