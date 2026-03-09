import type { ParticleBatchOptions } from '@nleidman/particular';
import { Pane } from 'tweakpane';
import type { FrameTimeGraphCallbacks } from './frameTimeGraph';
import { setupFrameTimeGraph } from './frameTimeGraph';
import type { Params } from './persistParams';
import { Ns_POW2 } from './persistParams';

/** Callbacks wired by the app after engine/scene/emitter exist. Reset is called when user clicks Reset to defaults. */
export type TweakpaneUiContext = {
  onReset?: () => void;
  recreateEmitter?: () => void;
  setUseLighting?: () => void;
  setLightColor?: () => void;
  setUseAlphaBlending?: () => void;
  applyTextureChoice?: () => void;
};

export type BindingApi = { refresh: () => void };

export type TweakpaneUiResult = {
  pane: Pane;
  bindings: BindingApi[];
  setKaDisabled: (disabled: boolean) => void;
  frameTimeCallbacks: FrameTimeGraphCallbacks | null;
};

// Tweakpane 4 types don't expose FolderApi methods on Pane; they exist at runtime
type PaneLike = {
  addFolder: (opts: { title: string; expanded?: boolean }) => PaneLike;
  addBinding: (obj: object, key: string, opts?: object) => BindingApi;
  addButton: (opts: { title: string }) => { on: (ev: string, fn: () => void) => void };
};
type ChangeableBindingApi = BindingApi & { on: (ev: string, fn: () => void) => void };

export function createTweakpaneUi(
  params: Params,
  context: TweakpaneUiContext,
  options: {
    compileConfig: (p: Params, x: number, y: number) => ParticleBatchOptions;
    enableFrameTimeGraph?: boolean;
  },
): TweakpaneUiResult {
  const pane = new Pane({ title: 'Emitter' });
  pane.element.classList.add('pane-floating');
  document.body.appendChild(pane.element);

  const frameTimeCallbacks = options.enableFrameTimeGraph === true ? setupFrameTimeGraph(pane) : null;

  const api: PaneLike = pane as unknown as PaneLike;
  const bindings: BindingApi[] = [];

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

  const materialFolder = api.addFolder({ title: 'Material', expanded: true });
  const useDiffuseAsAmbientBinding = addBinding(materialFolder, params.particle, 'useDiffuseAsAmbient', {
    label: 'Use diffuse as ambient',
  }) as ChangeableBindingApi;
  const kaBinding = addBinding(materialFolder, params.particle, 'Ka', {
    color: { type: 'float' },
    label: 'Ambient (Ka)',
  });
  const setKaDisabled = (v: boolean) => {
    (kaBinding as unknown as { disabled: boolean }).disabled = v;
  };
  setKaDisabled(params.particle.useDiffuseAsAmbient);
  useDiffuseAsAmbientBinding.on('change', () => setKaDisabled(params.particle.useDiffuseAsAmbient));
  addBinding(materialFolder, params.particle, 'Kd', { color: { type: 'float' }, label: 'Diffuse (Kd)' });
  addBinding(materialFolder, params.particle, 'Ks', { color: { type: 'float' }, label: 'Specular (Ks)' });
  const NsOptions: Record<string, number> = {};
  for (const n of Ns_POW2) NsOptions[String(n)] = n;
  addBinding(materialFolder, params.particle, 'Ns', { options: NsOptions, label: 'Shininess (Ns)' });

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
    context.onReset?.();
  });

  api.addButton({ title: 'Copy config JSON' }).on('click', () => {
    const config = options.compileConfig(params, 0, 0);
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  });

  const renderingFolder = api.addFolder({ title: 'Rendering', expanded: true });
  const useLightingBinding = addBinding(renderingFolder, params, 'useLighting', { label: 'Lighting' }) as ChangeableBindingApi;
  useLightingBinding.on('change', () => context.setUseLighting?.());
  const lightColorBinding = addBinding(renderingFolder, params, 'lightColor', {
    color: { type: 'float' },
    label: 'Light color',
  }) as ChangeableBindingApi;
  lightColorBinding.on('change', () => context.setLightColor?.());
  const useAlphaBlendingBinding = addBinding(renderingFolder, params, 'useAlphaBlending', {
    label: 'Alpha blending',
  }) as ChangeableBindingApi;
  useAlphaBlendingBinding.on('change', () => context.setUseAlphaBlending?.());
  const textureBinding = addBinding(renderingFolder, params, 'texture', {
    options: { None: 'none', 'Particle atlas': 'atlas' },
    label: 'Texture',
  }) as ChangeableBindingApi;
  textureBinding.on('change', () => context.applyTextureChoice?.());

  const orientationBinding = addBinding(orientationFolder, params, 'orientation', {
    options: { Billboard: 'billboard', Free: 'free' },
    label: 'Orientation',
  }) as ChangeableBindingApi;
  orientationBinding.on('change', () => context.recreateEmitter?.());

  return {
    pane,
    bindings,
    setKaDisabled,
    frameTimeCallbacks,
  };
}
