import {
  Emitter,
  Engine,
  type EmitterOrientation,
  ObjectLoader,
  type ParticleBatchOptions,
  Scene,
  TextureLoader,
} from '@nleidman/particular';
import cube from '../Chair.obj?raw';
import particleImage from '../img/particle_atlas.png';
import { Pane } from 'tweakpane';
import { setupFrameTimeGraph } from './frameTimeGraph';
import { createPersistentParams, resetParamsToDefaults } from './persistParams';

/** When true, shows GPU frame time graph and hooks into engine draw (adds per-frame overhead). Set false for production. */
const ENABLE_FRAME_TIME_GRAPH = true;

/* ——— Params (single source of truth for emitter batch options) ——— */

const params = createPersistentParams();

function compileConfig(originX: number, originY: number): ParticleBatchOptions {
  const p = params.particle;
  const ph = params.physics;
  const a = params.atlas;
  return {
    lifeTime: p.lifeTime,
    count: p.count,
    size: p.size,
    scale: { ...p.scale },
    origin: { x: originX, y: originY },
    v0: { ...p.v0 },
    velocityBias: { ...p.velocityBias },
    omega0: p.omega0,
    gravity: { ...p.gravity },
    spawnDuration: p.spawnDuration,
    Cd: ph.Cd,
    Cr: ph.Cr,
    density: ph.ro / 1000 ** 3,
    area: ph.area,
    mass: ph.mass,
    momentOfInertia: ph.momentOfInertia,
    atlas: {
      offset: { column: a.column, row: a.row },
      sweep: { by: a.sweepBy, stepTime: a.sweepStepTime, stepCount: a.sweepStepCount },
    },
    spawnSize: p.spawnSize,
    scaleWithAge: p.scaleWithAge,
    color: { r: p.color.r, g: p.color.g, b: p.color.b },
  };
}

/* ——— Tweakpane (floating) ——— */

const pane = new Pane({ title: 'Emitter' });
pane.element.classList.add('pane-floating');
document.body.appendChild(pane.element);

const frameTimeCallbacks = ENABLE_FRAME_TIME_GRAPH ? setupFrameTimeGraph(pane) : null;

// Tweakpane 4 types don't expose FolderApi methods on Pane; they exist at runtime
type BindingApi = { refresh: () => void };
type PaneLike = {
  addFolder: (opts: { title: string; expanded?: boolean }) => PaneLike;
  addBinding: (obj: object, key: string, opts?: object) => BindingApi;
  addButton: (opts: { title: string }) => { on: (ev: string, fn: () => void) => void };
};
const api: PaneLike = pane as unknown as PaneLike;
const bindings: BindingApi[] = [];
type ChangeableBindingApi = BindingApi & { on: (ev: string, fn: () => void) => void };

function addBinding(folder: PaneLike, obj: object, key: string, opts?: object): BindingApi {
  const b = folder.addBinding(obj, key, opts);
  bindings.push(b);
  return b;
}

const orientationFolder = api.addFolder({ title: 'Orientation', expanded: true });

const particleFolder = api.addFolder({ title: 'Particle', expanded: true });
addBinding(particleFolder, params.particle, 'lifeTime', { min: 100, max: 20000, step: 100, label: 'lifetime (ms)' });
addBinding(particleFolder, params.particle, 'count', { min: 1, max: 2000, step: 10, label: 'count' });
addBinding(particleFolder, params.particle, 'size', { min: 1, max: 500, step: 1, label: 'size (px)' });
addBinding(particleFolder, params.particle, 'scale', {
  label: 'scale',
  x: { min: 0.1, max: 3, step: 0.1 },
  y: { min: 0.1, max: 3, step: 0.1 },
  z: { min: 0.1, max: 3, step: 0.1 },
});
addBinding(particleFolder, params.particle, 'v0', {
  label: 'v0 (px/s)',
  x: { min: 0, max: 10000, step: 100 },
  y: { min: 0, max: 10000, step: 100 },
  z: { min: 0, max: 10000, step: 100 },
});
addBinding(particleFolder, params.particle, 'velocityBias', {
  label: 'velocity bias',
  x: { min: -1, max: 1, step: 0.1 },
  y: { min: -1, max: 1, step: 0.1 },
  z: { min: -1, max: 1, step: 0.1 },
});
addBinding(particleFolder, params.particle, 'omega0', { min: 0, max: 50, step: 0.5, label: 'omega0 (rad/s)' });
addBinding(particleFolder, params.particle, 'gravity', {
  label: 'gravity',
  x: { min: -5000, max: 5000, step: 100 },
  y: { min: -5000, max: 5000, step: 100 },
  z: { min: -5000, max: 5000, step: 100 },
});
addBinding(particleFolder, params.particle, 'spawnDuration', { min: 0, max: 2000, step: 50, label: 'spawn duration (ms)' });
addBinding(particleFolder, params.particle, 'spawnSize', { min: 0, max: 200, step: 5, label: 'spawn size (px)' });
addBinding(particleFolder, params.particle, 'scaleWithAge', { min: 0, max: 2, step: 0.1, label: 'scale with age' });
addBinding(particleFolder, params.particle, 'color', { color: { type: 'float' }, label: 'color' });

const physicsFolder = api.addFolder({ title: 'Physics', expanded: true });
addBinding(physicsFolder, params.physics, 'Cd', { min: 0, max: 5, step: 0.1, label: 'drag coeff' });
addBinding(physicsFolder, params.physics, 'Cr', { min: 0, max: 5, step: 0.1, label: 'angular drag' });
addBinding(physicsFolder, params.physics, 'ro', { min: 0, max: 2, step: 0.01, label: 'fluid density' });
addBinding(physicsFolder, params.physics, 'area', { min: 0, max: 2000, step: 50, label: 'area (px²)' });
addBinding(physicsFolder, params.physics, 'mass', { min: 1e-7, max: 0.01, step: 1e-6, label: 'mass (kg)' });
addBinding(physicsFolder, params.physics, 'momentOfInertia', { min: 1e-7, max: 0.01, step: 1e-6, label: 'moment of inertia' });

const atlasFolder = api.addFolder({ title: 'Atlas', expanded: false });
addBinding(atlasFolder, params.atlas, 'column', { min: 0, max: 16, step: 1, label: 'offset column' });
addBinding(atlasFolder, params.atlas, 'row', { min: 0, max: 16, step: 1, label: 'offset row' });
addBinding(atlasFolder, params.atlas, 'sweepBy', {
  options: { row: 'row', column: 'column' },
  label: 'sweep by',
});
addBinding(atlasFolder, params.atlas, 'sweepStepTime', { min: 0, max: 200, step: 1, label: 'sweep step (ms)' });
addBinding(atlasFolder, params.atlas, 'sweepStepCount', { min: 1, max: 32, step: 1, label: 'sweep steps' });

api.addButton({ title: 'Reset to defaults' }).on('click', () => {
  resetParamsToDefaults(params);
  bindings.forEach((b) => {
    b.refresh();
  });
  engine.draw();
});

api.addButton({ title: 'Copy config JSON' }).on('click', () => {
  const config = compileConfig(0, 0);
  navigator.clipboard.writeText(JSON.stringify(config, null, 2));
});

/* ——— Engine, scene, emitter ——— */

const container = document.getElementById('root') as HTMLDivElement;
const canvas = document.createElement('canvas');
container.appendChild(canvas);

const engine = new Engine(canvas, {
  size: { x: container.clientWidth, y: container.clientHeight },
  pixelRation: 2,
  ...(frameTimeCallbacks && {
    onBeforeDraw: () => frameTimeCallbacks.onBeforeDraw(engine),
    onAfterDraw: () => frameTimeCallbacks.onAfterDraw(engine),
  }),
});

const loader = new ObjectLoader();
loader.parseOBJ(cube); // keep for possible future body use

const scene = new Scene(engine, { perspective: 10000 });

let particleTexture: WebGLTexture | null = null;

function createEmitter(orientation: EmitterOrientation): Emitter {
  return new Emitter(engine, {
    orientation,
    atlasLayout: { columns: 2, rows: 1 },
    useLighting: params.useLighting,
    useAlphaBlending: params.useAlphaBlending,
  });
}

function recreateEmitter() {
  scene.remove(currentEmitter);
  currentEmitter = createEmitter(params.orientation);
  scene.add(currentEmitter);
  applyTextureChoice();
}

let currentEmitter = createEmitter(params.orientation);
scene.add(currentEmitter);

function applyTextureChoice() {
  if (params.texture === 'atlas' && particleTexture) {
    currentEmitter.setTexture(particleTexture);
  } else {
    currentEmitter.setTexture(null);
  }
}

const renderingFolder = api.addFolder({ title: 'Rendering', expanded: true });
const useLightingBinding = addBinding(renderingFolder, params, 'useLighting', { label: 'Lighting' }) as ChangeableBindingApi;
useLightingBinding.on('change', () => {
  currentEmitter.setUseLighting(params.useLighting);
});
const useAlphaBlendingBinding = addBinding(renderingFolder, params, 'useAlphaBlending', {
  label: 'Alpha blending',
}) as ChangeableBindingApi;
useAlphaBlendingBinding.on('change', () => {
  currentEmitter.setUseAlphaBlending(params.useAlphaBlending);
});

const textureBinding = addBinding(renderingFolder, params, 'texture', {
  options: { None: 'none', 'Particle atlas': 'atlas' },
  label: 'Texture',
}) as ChangeableBindingApi;
textureBinding.on('change', () => {
  applyTextureChoice();
});

applyTextureChoice();

const textureLoader = new TextureLoader(engine);
textureLoader.load(particleImage).then((texture: WebGLTexture) => {
  particleTexture = texture;
  applyTextureChoice();
});

const orientationBinding = addBinding(orientationFolder, params, 'orientation', {
  options: { Billboard: 'billboard', Free: 'free' },
  label: 'Orientation',
}) as ChangeableBindingApi;
orientationBinding.on('change', () => {
  recreateEmitter();
});

engine.start();

// Redraw on any pane change so updates are visible when paused
bindings.forEach((b) => {
  (b as ChangeableBindingApi).on('change', () => engine.draw());
});

container.addEventListener('click', (event: MouseEvent) => {
  currentEmitter.emit(compileConfig(event.clientX, event.clientY));
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'p' || event.key === ' ') {
    event.preventDefault();
    engine.togglePause();
  }
  if (event.key === 'ArrowLeft') {
    engine.skip(-1000 / 60);
  }
  if (event.key === 'ArrowRight') {
    engine.skip(1000 / 60);
  }
});

window.addEventListener('resize', () => {
  engine.resize(container.clientWidth, container.clientHeight);
});
