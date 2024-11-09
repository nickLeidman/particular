import { Particular } from '../../../src';
import { Particle } from '../../../src/particle/particle';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const engine = new Particular.Engine(canvas);

engine.setup((gl) => {
  console.log('WebGL is supported');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
});

const scene = new Particular.Scene(engine, { perspective: 1000 });

engine.addScene(scene);

const emitter = new Particular.Emitter(engine);

scene.add(emitter);

engine.start();

document.addEventListener('click', (event) => {
  emitter.emit(
    new Particle({
      lifeTime: 2000,
      count: 10000 + Math.random() * 500,
      // count: 1,
      size: 60,
      origin: { x: event.clientX * window.devicePixelRatio, y: event.clientY * window.devicePixelRatio },
      v0: 2000,
    }),
  );
});
