import { Engine, Emitter, GaussianBlurShader, ParticleBatchOptions, Scene, TextureLoader, QuadRenderer } from '@nleidman/particular';
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
      pixelRation: 2,
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

    const scene = new Scene(engine);

    const textureLoader = new TextureLoader(engine);
    const texture = await textureLoader.load(particleImage);

    emitter = new Emitter(engine, {
      texture: texture,
      atlasLayout: { columns: 2, rows: 1 },
      is2d: true,
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
