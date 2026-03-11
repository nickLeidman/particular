import { Emitter, Engine, type ParticleBatchOptions, Scene, TextureLoader } from '@nleidman/particular';
import particleImage from '../../img/particle_atlas.png';

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
  config: ParticleBatchOptions;
}

let engine: Engine;
let emitter: Emitter;

addEventListener('message', async (event) => {
  if (event.data?.name === 'init') {
    const data = event.data as InitMessage;
    engine = new Engine(data.canvas, {
      size: data.size,
      pixelRatio: 2,
    });

    // const gaussianShader = new GaussianBlurShader(engine, {radius: 10});
    // const quadDrawer = new QuadRenderer(engine);
    // engine.attachPostProcessor((sourceTexture) => {
    //   engine.timer.measure('quad', () =>
    //     quadDrawer.draw(sourceTexture), (label, nanoseconds) => {
    //       console.log(`${label}: ${nanoseconds / 1000000}ms`);
    //   })
    // })
    // engine.attachPostProcessor((sourceTexture) => {
    //   gaussianShader.draw(sourceTexture)
    // })
    //
    // const scene = new Scene(engine, {
    //   perspective: 4000,
    // });

    const scene = new Scene(engine, { perspective: 10000 });

    const textureLoader = new TextureLoader(engine);
    const texture = await textureLoader.load(particleImage);

    emitter = new Emitter(engine, {
      texture: texture,
      orientation: 'billboard',
      atlasLayout: { columns: 2, rows: 1 },
    });

    scene.add(emitter);
    engine.addScene(scene);

    engine.start();
  }

  if (event.data?.name === 'emit') {
    const data = event.data as EmitMessage;
    emitter?.emit(data.config);
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
