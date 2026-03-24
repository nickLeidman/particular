# Particular

> Words of caution: **this is a work in progress**.
>
> Please be aware that some APIs may change, and some functionality may not be implemented yet.

Particular is a small library for rendering particle effects.
It targets **WebGL2**, is published as an **ES module**, and can run on a main-thread canvas or an **OffscreenCanvas** in a worker.

## Installing

```bash
npm install @nleidman/particular
```

## Usage

`Engine` takes **CSS layout size** and **device pixel ratio**; internal resolution is `size * pixelRatio`. The scene expects a `Camera` (orthographic or perspective). `Emitter` accepts `EmitterOptions` such as `orientation: 'billboard' | 'free'`, optional `texture`, `atlasLayout`, `modelGeometries`, `useLighting`, and `useAlphaBlending`.

```ts
import {
  Camera,
  Engine,
  Emitter,
  Scene,
  TextureLoader,
  type ParticleBatchOptions,
} from '@nleidman/particular';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;

const engine = new Engine(canvas, {
  size: { x: window.innerWidth, y: window.innerHeight },
  pixelRatio: window.devicePixelRatio || 1,
});

const camera = new Camera(engine, 'orthographic', 1000);
const scene = new Scene({ camera });

const texture = await new TextureLoader(engine).load('/textures/particle_atlas.png');

const emitter = new Emitter(engine, {
  texture,
  orientation: 'billboard',
  atlasLayout: { columns: 4, rows: 4 },
});

scene.add(emitter);
engine.addScene(scene);
engine.start();

const batch: ParticleBatchOptions = {
  lifeTime: 5000,
  count: 200,
  size: 24,
  origin: { x: 400, y: 300 },
  v0: { x: 0, y: -200, z: 0 },
  omega0: 2,
  gravity: { x: 0, y: 400, z: 0 },
  Cd: 0.5,
  Cr: 0.5,
  density: 1.225,
  area: 100,
  mass: 0.01,
  momentOfInertia: 10,
  atlas: { offset: { column: 0, row: 0 } },
  scaleWithAge: 0,
  spawnSize: 0,
};

emitter.emit(batch);
```

On resize, call `engine.resize(cssWidth, cssHeight)`; the engine refreshes each scene’s camera projection for the new resolution.

## Particle batch options

Shape of `ParticleBatchOptions` (see `src/emitter/types.ts` in the repo):

```ts
export interface ParticleBatchOptions {
  /** Lifetime of a particle batch in **ms**; batch ends after `lifeTime` + `spawnDuration` */
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
  /** Origin in **pixels**, relative to the top-left of the canvas */
  origin: { x: number; y: number };
  /** Initial velocity in **pixels/s**. Each particle gets a random velocity from `-v0` to `v0` per axis before bias/spread. */
  v0: { x: number; y: number; z: number };
  /**
   * Velocity bias in fractions of `v0` per axis (shifts the random range).
   * @default { x: 0, y: 0, z: 0 }
   */
  velocityBias?: { x: number; y: number; z: number };
  /**
   * Per-axis fraction of the full velocity range used for random spread (1 = full range, 0 = no spread).
   * @default { x: 1, y: 1, z: 1 }
   */
  velocitySpread?: { x: number; y: number; z: number };
  /**
   * Initial angular velocity in **rad/s**; each particle uses a random value in [-omega0, omega0].
   */
  omega0: number;
  /**
   * If true, each particle gets a random initial rotation; if false, all start at 0.
   * @default false
   */
  randomStartRotation?: boolean;
  /** Gravity in **pixels/s²** */
  gravity: { x: number; y: number; z: number };
  /**
   * Spawn window in **ms** (particles appear over this duration).
   * @default 0
   */
  spawnDuration?: number;
  /** Drag coefficient (fluid model) */
  Cd: number;
  /** Angular drag coefficient (fluid model) */
  Cr: number;
  /** Fluid density in **kg/kpx³** */
  density: number;
  /** Cross-sectional area in **px²** */
  area: number;
  /** Mass in **kg** */
  mass: number;
  /** Moment of inertia in **kg·px²** */
  momentOfInertia: number;
  /**
   * Atlas frame and optional sweep animation.
   * @default { offset: { column: 0, row: 0 } }
   */
  atlas: {
    offset: { column: number; row: number };
    sweep?: { by: 'column' | 'row'; stepTime: number; stepCount: number };
  };
  /**
   * Extra scale factor driven by particle age.
   * @default 0
   */
  scaleWithAge: number;
  /** Diameter of the spawn disk in **pixels** */
  spawnSize: number;
  /**
   * Phong-style material. With a particle texture, Ka and Kd come from the texture; Ks and Ns always come from the batch.
   * RGB in [0, 1]; Ns (shininess) often in ~1–500.
   */
  Ka?: { r: number; g: number; b: number };
  Kd?: { r: number; g: number; b: number };
  Ks?: { r: number; g: number; b: number };
  Ns?: number;
  /**
   * Sway: sideways displacement from simplex noise (amplitude in **pixels**). 0 = off.
   * @default 0
   */
  swayStrength?: number;
  /**
   * Sway: time scale for noise sampling (e.g. age * scale). ~0.04 works well with period-2 tileable noise.
   * @default 0.04
   */
  swayTimeScale?: number;
}
```

`Emitter` merges these with defaults and derives `drag` and `angularDrag` from the physics fields before drawing.

## Demo

From the repository root, run `npm run dev` to open the Vite demo workspace (click to emit, Tweakpane for parameters).
