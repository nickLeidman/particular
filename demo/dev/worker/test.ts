import { type Engine, Particular } from '../../../src';
import type { Emitter } from '../../../src/emitter/emitter';
import { Vec2 } from '../../../src/vec2';

interface InitMessage {
  name: 'init';
  canvas: OffscreenCanvas;
  size: { x: number; y: number };
}

interface EmitMessage {
  name: 'emit';
  config: ConstructorParameters<typeof Particular.ParticleBatch>[0];
}

let particular: Engine;
let emitter: Emitter;

addEventListener('message', (event) => {
  if (event.data?.name === 'init') {
    const data = event.data as InitMessage;
    particular = new Particular(data.canvas, new Vec2(data.size.x, data.size.y), {
      beforeSetup: (gl) => {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        // gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      },
    });

    const scene = new Particular.Scene(particular);

    particular.addScene(scene);

    emitter = new Particular.Emitter(particular);

    scene.add(emitter);

    particular.start();
  }

  if (event.data?.name === 'emit') {
    const data = event.data as EmitMessage;
    emitter?.emit(new Particular.ParticleBatch(data.config));
  }
});
