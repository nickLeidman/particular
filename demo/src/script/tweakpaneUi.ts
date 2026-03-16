import type { ParticleBatchOptions } from '@nleidman/particular';
import { Pane } from 'tweakpane';
import type { FrameTimeGraphCallbacks } from './frameTimeGraph';
import { setupFrameTimeGraph } from './frameTimeGraph';
import type { Params, TextureChoice } from './persistParams';
import { Ns_POW2 } from './persistParams';

/** Callbacks wired by the app after engine/scene/emitter exist. Reset is called when user clicks Reset to defaults. */
export type TweakpaneUiContext = {
  onReset?: () => void;
  recreateEmitter?: () => void;
  setUseLighting?: () => void;
  setLightColor?: () => void;
  setUseAlphaBlending?: () => void;
  applyTextureChoice?: () => void;
  applyCamera?: () => void;
  /** Apply current particle/physics/atlas/material params to all existing batches (realtime). */
  updateBatches?: () => void;
  /** Called when user selects a file via "Load texture". */
  onLoadCustomTexture?: (file: File) => void;
  /** Called when user clicks "Clear custom texture". */
  onClearCustomTexture?: () => void;
  /** Toggle debug overlay (e.g. noise preview). */
  setNoisePreviewVisible?: (visible: boolean) => void;
};

export type BindingApi = { refresh: () => void };

export type TweakpaneUiResult = {
  pane: Pane;
  bindings: BindingApi[];
  setKaDisabled: (disabled: boolean) => void;
  frameTimeCallbacks: FrameTimeGraphCallbacks | null;
  /** Call when a custom texture is saved or removed so the texture picker can show/hide "Custom". */
  setCustomTextureAvailable: (available: boolean) => void;
};

// Tweakpane 4 types don't expose FolderApi methods on Pane; they exist at runtime
type PaneLike = {
  addFolder: (opts: { title: string; expanded?: boolean }) => PaneLike;
  addBinding: (obj: object, key: string, opts?: object) => BindingApi;
  addButton: (opts: { title: string }) => { on: (ev: string, fn: () => void) => void };
};
type ChangeableBindingApi = BindingApi & { on: (ev: string, fn: () => void) => void; dispose?: () => void };

export function createTweakpaneUi(
  params: Params,
  context: TweakpaneUiContext,
  options: {
    compileConfig: (p: Params, x: number, y: number) => ParticleBatchOptions;
    enableFrameTimeGraph?: boolean;
  },
): TweakpaneUiResult {
  const container = document.createElement('div');
  container.classList.add('pane-container');
  document.body.appendChild(container);

  const cameraPane = new Pane({ title: 'Camera' });
  container.appendChild(cameraPane.element);

  const lightingPane = new Pane({ title: 'Lighting' });
  container.appendChild(lightingPane.element);

  const pane = new Pane({ title: 'Emitter' });
  container.appendChild(pane.element);

  const debugPane = new Pane({ title: 'Debug' });
  container.appendChild(debugPane.element);

  const frameTimeCallbacks = options.enableFrameTimeGraph === true ? setupFrameTimeGraph(pane) : null;

  const api: PaneLike = pane as unknown as PaneLike;
  const cameraApi: PaneLike = cameraPane as unknown as PaneLike;
  const lightingApi: PaneLike = lightingPane as unknown as PaneLike;
  const debugApi: PaneLike = debugPane as unknown as PaneLike;
  const bindings: BindingApi[] = [];

  function addBinding(folder: PaneLike, obj: object, key: string, opts?: object): BindingApi {
    const b = folder.addBinding(obj, key, opts);
    bindings.push(b);
    return b;
  }

  const orientationFolder = api.addFolder({ title: 'Orientation', expanded: true });

  const cameraDistanceBinding = addBinding(cameraApi, params.camera, 'distance', {
    min: 100,
    max: 20000,
    step: 100,
    label: 'distance',
  }) as ChangeableBindingApi;
  cameraDistanceBinding.on('change', () => context.applyCamera?.());
  const cameraTypeBinding = addBinding(cameraApi, params.camera, 'type', {
    options: { Perspective: 'perspective', Orthographic: 'orthographic' },
    label: 'type',
  }) as ChangeableBindingApi;
  cameraTypeBinding.on('change', () => context.applyCamera?.());

  const particleFolder = api.addFolder({ title: 'Particle', expanded: true });
  addBinding(particleFolder, params.particle, 'lifeTime', { min: 100, step: 100, label: 'lifetime (ms)' });
  addBinding(particleFolder, params.particle, 'count', { min: 1, step: 1, label: 'count' });
  addBinding(particleFolder, params.particle, 'size', { min: 1, max: 500, step: 1, label: 'size (px)' });
  addBinding(particleFolder, params.particle, 'scale', {
    label: 'scale',
    x: { min: 0.1, max: 3, step: 0.1 },
    y: { min: 0.1, max: 3, step: 0.1 },
    z: { min: 0.1, max: 3, step: 0.1 },
  });
  addBinding(particleFolder, params.particle, 'v0', {
    label: 'velocity (px/s)',
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
  addBinding(particleFolder, params.particle, 'velocitySpread', {
    label: 'velocity spread',
    x: { min: 0, max: 1, step: 0.05 },
    y: { min: 0, max: 1, step: 0.05 },
    z: { min: 0, max: 1, step: 0.05 },
  });
  addBinding(particleFolder, params.particle, 'omega0', { min: 0, step: 0.5, label: 'angular velocity (rad/s)' });
  addBinding(particleFolder, params.particle, 'randomStartRotation', { label: 'random start rotation' });
  addBinding(particleFolder, params.particle, 'gravity', {
    label: 'gravity',
    x: { min: -5000, max: 5000, step: 100 },
    y: { min: -5000, max: 5000, step: 100 },
    z: { min: -5000, max: 5000, step: 100 },
  });
  addBinding(particleFolder, params.particle, 'spawnDuration', { min: 0, step: 50, label: 'spawn duration (ms)' });
  addBinding(particleFolder, params.particle, 'spawnSize', { min: 0, step: 1, label: 'spawn size (px)' });
  addBinding(particleFolder, params.particle, 'scaleWithAge', { min: -5, max: 5, step: 0.1, label: 'shrink with age' });
  addBinding(particleFolder, params.particle, 'swayStrength', { min: 0, step: 1, label: 'sway strength (px)' });
  addBinding(particleFolder, params.particle, 'swayTimeScale', { step: 0.01, label: 'sway time scale' });

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

  const renderingFolder = api.addFolder({ title: 'Rendering', expanded: true });
  const useAlphaBlendingBinding = addBinding(renderingFolder, params, 'useAlphaBlending', {
    label: 'Alpha blending',
  }) as ChangeableBindingApi;
  useAlphaBlendingBinding.on('change', () => context.setUseAlphaBlending?.());

  let customTextureAvailable = false;
  let textureBinding: ChangeableBindingApi | null = null;

  function refreshTextureBinding(): void {
    if (textureBinding?.dispose) {
      textureBinding.dispose();
      const i = bindings.indexOf(textureBinding);
      if (i >= 0) bindings.splice(i, 1);
    }
    const options: Record<string, TextureChoice> = { None: 'none', 'Particle atlas': 'atlas' };
    if (customTextureAvailable) options['Custom'] = 'custom';
    textureBinding = addBinding(renderingFolder, params, 'texture', { options, label: 'Texture' }) as ChangeableBindingApi;
    textureBinding.on('change', () => context.applyTextureChoice?.());
  }
  refreshTextureBinding();

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      context.onLoadCustomTexture?.(file);
      fileInput.value = '';
    }
  });

  renderingFolder.addButton({ title: 'Load texture' }).on('click', () => fileInput.click());
  renderingFolder.addButton({ title: 'Clear custom texture' }).on('click', () => context.onClearCustomTexture?.());

  function setCustomTextureAvailable(available: boolean): void {
    if (available === customTextureAvailable) return;
    customTextureAvailable = available;
    refreshTextureBinding();
  }

  const atlasFolder = api.addFolder({ title: 'Atlas', expanded: false });
  const atlasColumnsBinding = addBinding(atlasFolder, params.atlasLayout, 'columns', {
    step: 1,
    label: 'columns',
  }) as ChangeableBindingApi;
  atlasColumnsBinding.on('change', () => context.recreateEmitter?.());
  const atlasRowsBinding = addBinding(atlasFolder, params.atlasLayout, 'rows', {
    step: 1,
    label: 'rows',
  }) as ChangeableBindingApi;
  atlasRowsBinding.on('change', () => context.recreateEmitter?.());
  addBinding(atlasFolder, params.atlas, 'column', { step: 1, label: 'offset column' });
  addBinding(atlasFolder, params.atlas, 'row', { step: 1, label: 'offset row' });
  addBinding(atlasFolder, params.atlas, 'sweepBy', {
    options: { row: 'row', column: 'column' },
    label: 'sweep by',
  });
  addBinding(atlasFolder, params.atlas, 'sweepStepTime', { min: 0, max: 200, step: 1, label: 'sweep step (ms)' });
  addBinding(atlasFolder, params.atlas, 'sweepStepCount', { min: 1, max: 32, step: 1, label: 'sweep steps' });

  const debugState = { noisePreview: false };
  const noisePreviewBinding = addBinding(debugApi, debugState, 'noisePreview', {
    label: 'Noise preview',
  }) as ChangeableBindingApi;
  noisePreviewBinding.on('change', () => context.setNoisePreviewVisible?.(debugState.noisePreview));

  api.addButton({ title: 'Reset to defaults' }).on('click', () => {
    context.onReset?.();
  });

  api.addButton({ title: 'Copy config JSON' }).on('click', () => {
    const config = options.compileConfig(params, 0, 0);
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  });

  const useLightingBinding = addBinding(lightingApi, params, 'useLighting', { label: 'Enabled' }) as ChangeableBindingApi;
  useLightingBinding.on('change', () => context.setUseLighting?.());
  const lightColorBinding = addBinding(lightingApi, params, 'lightColor', {
    color: { type: 'float' },
    label: 'Color',
  }) as ChangeableBindingApi;
  lightColorBinding.on('change', () => context.setLightColor?.());

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
    setCustomTextureAvailable,
  };
}
