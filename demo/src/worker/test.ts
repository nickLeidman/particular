import { Engine, Emitter, Vec2, ParticleBatch, Scene, TextureLoader } from 'particular';
import particleImage from '../img/particle.png';

interface InitMessage {
  name: 'init';
  canvas: OffscreenCanvas;
  size: { x: number; y: number };
}

interface ResizeMessage {
  size: { x: number; y: number };
}

interface EmitMessage {
  name: 'emit';
  config: ConstructorParameters<typeof ParticleBatch>[0];
}

let engine: Engine;
let emitter: Emitter;

addEventListener('message', async (event) => {
  if (event.data?.name === 'init') {
    const data = event.data as InitMessage;
    engine = new Engine(data.canvas, {
      size: new Vec2(data.size.x, data.size.y),
      pixelRation: 2,
    });

    // const fadeShader = new FadeShader(engine, { fadeStartingPoint: 0.5 });
    // engine.attachPostProcessor((sourceTexture) => {
    //   fadeShader.draw(sourceTexture);
    // });

    const scene = new Scene(engine);

    const textureLoader = new TextureLoader(engine);
    const texture = await textureLoader.load(particleImage);

    emitter = new Emitter(engine, { texture: texture, is2d: true, spawnSize: 20, scaleWithAge: 0 });

    scene.add(emitter);

    engine.addScene(scene);

    engine.start();
  }

  if (event.data?.name === 'emit') {
    const data = event.data as EmitMessage;
    emitter?.emit(new ParticleBatch(data.config));
  }

  if (event.data?.name === 'togglePause') {
    engine.togglePause();
  }

  if (event.data?.name === 'skipForward') {
    engine.skip(20);
  }

  if (event.data?.name === 'skipBackward') {
    engine.skip(-20);
  }

  if (event.data?.name === 'resize') {
    const data = event.data as ResizeMessage;
    engine.resize(data.size.x, data.size.y);
  }
});
