import { Body, Emitter, Engine, ObjectLoader, type ParticleBatchOptions, QuadRenderer, Scene, TextureLoader } from '@nleidman/particular';
import cube from '../Chair.obj?raw';
import particleImage from '../img/particle_atlas.png';

// import MyWorker from './worker/worker?worker';

function getInputValue(id: string) {
  return (document.getElementById(id) as HTMLInputElement).valueAsNumber;
}

const compileConfig = (x: number, y: number): ParticleBatchOptions => {
  return {
    lifeTime: getInputValue('lifeTime'),
    count: getInputValue('count'),
    size: 50,
    aspectRatio: getInputValue('aspectRatio'),
    origin: { x, y },
    v0: { x: getInputValue('v0'), y: getInputValue('v0'), z: getInputValue('v0') },
    velocityBias: { x: 0, y: 0, z: 0 },
    omega0: getInputValue('omega0'),
    gravity: { x: 0, y: getInputValue('g'), z: 0 },
    spawnDuration: getInputValue('spawnDuration'),
    Cd: getInputValue('Cd'),
    Cr: getInputValue('Cr'),
    density: getInputValue('ro') / 1000 ** 3,
    area: getInputValue('A'),
    mass: getInputValue('m'),
    momentOfInertia: getInputValue('I'),
    atlas: { offset: { column: 0, row: 0 }, sweep: { by: 'row', stepTime: 1000 / 60, stepCount: 1 } },
    spawnSize: 20,
    scaleWithAge: 1,
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

const engine = new Engine(canvas, {
  size: { x: container.clientWidth, y: container.clientHeight },
  pixelRation: 2,
});

const loader = new ObjectLoader();

const body = new Body(engine, loader.parseOBJ(cube).geometries);

const quadDrawer = new QuadRenderer(engine);
engine.attachPostProcessor((sourceTexture: WebGLTexture) => {
  quadDrawer.draw(sourceTexture);
});

const scene = new Scene(engine, {
  perspective: 10000,
});

const emitter = new Emitter(engine, {
  atlasLayout: { columns: 2, rows: 1 },
  is2d: true,
});

const textureLoader = new TextureLoader(engine);
textureLoader.load(particleImage).then((texture: WebGLTexture) => {
  emitter.setTexture(texture);
});

scene.add(emitter);
// scene.add(body);

engine.start();

container.addEventListener('click', (event) => {
  emitter.emit(compileConfig(event.clientX, event.clientY));
});

/* New test ts worker */

// const worker = new MyWorker() as Worker;
//
// // listen for console-log events
//
// worker.addEventListener('message', (event) => {
//   console.log(event.data);
// });
//
// if (canvas.transferControlToOffscreen) {
//   const offscreen = canvas.transferControlToOffscreen();
//   worker.postMessage(
//     {
//       name: 'init',
//       canvas: offscreen,
//       size: {x: container.clientWidth, y: container.clientHeight},
//     },
//     [offscreen],
//   ); // Transfer control
// } else {
//   console.error('OffscreenCanvas is not supported in this browser.');
// }
//
// container.addEventListener('click', (event) => {
//   worker.postMessage({
//     name: 'emit',
//     config: compileConfig(event.clientX, event.clientY),
//   });
// });
//
// window.addEventListener('keydown', (event) => {
//   if (event.key === 'p' || event.key === ' ') {
//     worker.postMessage({
//       name: 'togglePause',
//     });
//   } else if (event.key === 'ArrowLeft') {
//     worker.postMessage({
//       name: 'skipBackward',
//     });
//   } else if (event.key === 'ArrowRight') {
//     worker.postMessage({
//       name: 'skipForward',
//     });
//   }
// });
//
// window.addEventListener('resize', () => {
//   worker.postMessage({
//     name: 'resize',
//     size: {x: container.clientWidth, y: container.clientHeight},
//   });
// });
