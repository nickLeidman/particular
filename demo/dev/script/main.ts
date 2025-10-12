// @ts-ignore
import MyWorker from '../worker/test?worker';
import type { ParticleBatch } from '../../../src/particle/particleBatch';

function getInputValue(id: string) {
  return (document.getElementById(id) as HTMLInputElement).valueAsNumber;
}

const compileConfig = (x: number, y: number): ConstructorParameters<typeof ParticleBatch>[0] => {
  return {
    lifeTime: getInputValue('lifeTime'),
    count: getInputValue('count'),
    size: 50,
    aspectRatio: 1,
    origin: { x, y },
    v0: { x: getInputValue('v0'), y: getInputValue('v0'), z: getInputValue('v0') },
    omegaDistribution: getInputValue('omegaDistribution'),
    velocityVariance: { x: 0.5, y: 0.5, z: 0.5 },
    gravity: { x: 0, y: getInputValue('g'), z: 0 },
    spawnDuration: getInputValue('spawnDuration'),
    Cd: getInputValue('Cd'),
    Cr: getInputValue('Cr'),
    density: getInputValue('ro') / 1000 ** 3,
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

window.addEventListener('keydown', (event) => {
  if (event.key === 'p' || event.key === ' ') {
    worker.postMessage({
      name: 'togglePause',
    });
  } else if (event.key === 'ArrowLeft') {
    worker.postMessage({
      name: 'skipBackward',
    });
  } else if (event.key === 'ArrowRight') {
    worker.postMessage({
      name: 'skipForward',
    });
  }
});

window.addEventListener('resize', () => {
  worker.postMessage({
    name: 'resize',
    size: { x: container.clientWidth, y: container.clientHeight },
  });
});
