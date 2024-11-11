import { Particular } from '../../../src';
import { Particle } from '../../../src/particle/particle';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const particular = new Particular(canvas, {
  beforeSetup: (gl) => {
    console.log('WebGL is supported');
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  },
});

const scene = new Particular.Scene(particular, { perspective: 1000 });

particular.addScene(scene);

const emitter = new Particular.Emitter(particular);

scene.add(emitter);

particular.start();

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
