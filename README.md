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
import { Engine, Emitter, Vec2, ParticleBatch, Scene, TextureLoader } from 'particular';

engine = new Engine(data.canvas, new Vec2(data.size.x, data.size.y));

const scene = new Scene(engine);

emitter = new Emitter(engine, { texture: texture, is2d: true, spawnSize: 20, scaleWithAge: 0 });

scene.add(emitter);

engine.addScene(scene);

engine.start();

emitter.emit(new ParticleBatch({
  // particle batch configuration
}));

```