# Particular

Particular is a simple library for rendering particle effects.
It uses WebGL2 and supports running in workers.

## Installing



## Usage

Basic setup of a particle system:

```ts

engine = new Engine(data.canvas, new Vec2(data.size.x, data.size.y));

const scene = new Scene(engine);

emitter = new Emitter(engine, { texture: texture, is2d: true, spawnSize: 20, scaleWithAge: 0 });

scene.add(emitter);

engine.addScene(scene);

engine.start();

```