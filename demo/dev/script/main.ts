import type { Particular } from '../../../src';
import { Vec2 } from '../../../src/vec2';
import MyWorker from '../worker/test?worker';

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
const canvas = document.createElement('canvas');
container.appendChild(canvas);

/* New test ts worker */

const worker = new MyWorker() as Worker;

// listen for console-log events

worker.addEventListener('message', (event) => {
  console.log(event.data);
});

if (canvas.transferControlToOffscreen) {
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage(
    {
      name: 'init',
      canvas: offscreen,
      size: { x: container.clientWidth, y: container.clientHeight },
    },
    [offscreen],
  ); // Transfer control
} else {
  console.error('OffscreenCanvas is not supported in this browser.');
}

container.addEventListener('click', (event) => {
  worker.postMessage({
    name: 'emit',
    config: compileConfig(event.clientX, event.clientY),
  });
});

// setInterval(() => {
worker.postMessage({
  name: 'emit',
  config: compileConfig(Math.random() * (container.clientWidth / 2), Math.random() * (container.clientHeight / 2)),
});
// }, 1000);
