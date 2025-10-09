import { type Engine, Particular } from '../../../src';
import type { Emitter } from '../../../src/emitter/emitter';
import { Vec2 } from '../../../src/vec2';
import img_0 from '../img/img_0.png';
import img_1 from '../img/img_1.png';
import img_2 from '../img/img_2.png';
import img_3 from '../img/img_3.png';
import { FadeShader } from '../../../src/textureRenderer/quadRenderer';

interface InitMessage {
  name: 'init';
  canvas: OffscreenCanvas;
  size: { x: number; y: number };
}

interface EmitMessage {
  name: 'emit';
  config: ConstructorParameters<typeof Particular.ParticleBatch>[0];
}

let engine: Engine;
let emitter: Emitter;

addEventListener('message', async (event) => {
  if (event.data?.name === 'init') {
    const data = event.data as InitMessage;
    engine = new Particular(data.canvas, new Vec2(data.size.x, data.size.y));

    const fadeShader = new FadeShader(engine, { fadeStartingPoint: 0.5 });
    engine.attachPostProcessor((sourceTexture) => {
      fadeShader.draw(sourceTexture);
    });

    const scene = new Particular.Scene(engine);

    engine.addScene(scene);

    const texture = await engine.TextureLoader.load(img_0);

    emitter = new Particular.Emitter(engine, { texture: texture, is2d: true, spawnSize: 20, scaleWithAge: 0 });

    scene.add(emitter);

    engine.start();
  }

  if (event.data?.name === 'emit') {
    const data = event.data as EmitMessage;
    emitter?.emit(new Particular.ParticleBatch(data.config));
  }
});
