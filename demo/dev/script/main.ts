import { Particular } from '../../../src';
import { Particle } from '../../../src/particle/particle';

function getInputValue(id: string) {
  return (document.getElementById(id) as HTMLInputElement).valueAsNumber;
}

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

const scene = new Particular.Scene(particular);

particular.addScene(scene);

const emitter = new Particular.Emitter(particular);

scene.add(emitter);

particular.start();

container.addEventListener('click', (event) => {
  emitter.emit(
    new Particle({
      lifeTime: getInputValue('lifeTime'),
      count: getInputValue('count'),
      size: getInputValue('size'),
      origin: { x: event.clientX, y: event.clientY },
      v0: getInputValue('v0'),
      gravity: { x: 0, y: getInputValue('g'), z: 0 },
      spawnDuration: getInputValue('spawnDuration'),
      Cd: getInputValue('Cd'),
      Cr: getInputValue('Cr'),
      density: getInputValue('ro') / Math.pow(1000, 3),
      area: getInputValue('A'),
      mass: getInputValue('m'),
      momentOfInertia: getInputValue('I'),
    }),
  );
});
