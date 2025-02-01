import { Particular } from '../../../src';

function getInputValue(id: string) {
  return (document.getElementById(id) as HTMLInputElement).valueAsNumber;
}

const compileConfig = (x: number, y: number): ConstructorParameters<typeof Particular.ParticleBatch>[0] => {
  return {
    lifeTime: getInputValue('lifeTime'),
    count: getInputValue('count'),
    size: getInputValue('size'),
    origin: { x, y },
    v0: { x: getInputValue('v0'), y: getInputValue('v0'), z: getInputValue('v0') },
    velocityVariance: { x: 0.5, y: 0.5, z: 0.5 },
    gravity: { x: 0, y: getInputValue('g'), z: 0 },
    spawnDuration: getInputValue('spawnDuration'),
    Cd: getInputValue('Cd'),
    Cr: getInputValue('Cr'),
    density: getInputValue('ro') / Math.pow(1000, 3),
    area: getInputValue('A'),
    mass: getInputValue('m'),
    momentOfInertia: getInputValue('I'),
  };
};

/* Export */

const extractButton = document.getElementById('extractConfig') as HTMLButtonElement;

extractButton.addEventListener('click', () => {
  const config = compileConfig(0, 0);
  const configString = JSON.stringify(config, null, 2);
  // copy to clipboard
  navigator.clipboard.writeText(configString);
});

/* Particular */

const container = document.getElementById('root') as HTMLDivElement;

const particular = new Particular(container, {
  beforeSetup: (gl) => {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  },
});

const scene = new Particular.Scene(particular);

particular.addScene(scene);

const emitter = new Particular.Emitter(particular);

scene.add(emitter);

particular.start();

container.addEventListener('click', (event) => {
  emitter.emit(new Particular.ParticleBatch(compileConfig(event.clientX, event.clientY)));
});
