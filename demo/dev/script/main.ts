import { Particular } from '../../../src';
import { Particle } from '../../../src/particle/particle';

const container = document.getElementById('root') as HTMLDivElement;

const particular = new Particular(container, {
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

container.addEventListener('click', (event) => {
  emitter.emit(
    new Particle({
      lifeTime: document.getElementById('lifeTime')?.valueAsNumber || 1000,
      count: document.getElementById('count')?.valueAsNumber || 1000,
      // count: 1,
      size: document.getElementById('size')?.valueAsNumber || 40,
      origin: { x: event.clientX, y: event.clientY },
      v0: document.getElementById('v0')?.valueAsNumber || 3000,
    }),
  );
});
