import type { BindingApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import type { Params, TextureChoice } from '../../script/persistParams';
import type { TweakpaneUiContext } from '..';

export type EmitterPaneResult = {
  pane: Pane;
  bindings: BindingApi[];
  setCustomTextureAvailable: (available: boolean) => void;
  setCustomObjectAvailable: (available: boolean) => void;
};

export const createEmitterPane = (params: Params, context: TweakpaneUiContext): EmitterPaneResult => {
  const emitterPane = new Pane({ title: 'Emitter' });
  const bindings: BindingApi[] = [];

  const orientationBinding = emitterPane.addBinding(params.emitter, 'orientation', {
    options: { Billboard: 'billboard', Free: 'free' },
    label: 'Orientation',
  });
  orientationBinding.on('change', () => context.recreateEmitter?.());
  bindings.push(orientationBinding);

  const useAlphaBlendingBinding = emitterPane.addBinding(params.emitter, 'useAlphaBlending', {
    label: 'Alpha blending',
  });
  useAlphaBlendingBinding.on('change', () => context.setUseAlphaBlending?.());
  bindings.push(useAlphaBlendingBinding);

  const bloomFolder = emitterPane.addFolder({
    title: 'Bloom',
    expanded: false,
  });

  const bloomEnabledBinding = bloomFolder.addBinding(params.emitter.bloom, 'enabled', { label: 'Enabled' });
  bloomEnabledBinding.on('change', () => context.setBloom?.());
  bindings.push(bloomEnabledBinding);

  const bloomThresholdBinding = bloomFolder.addBinding(params.emitter.bloom, 'threshold', {
    label: 'Threshold',
    min: 0,
    max: 8,
    step: 0.01,
  });
  bloomThresholdBinding.on('change', () => context.setBloom?.());
  bindings.push(bloomThresholdBinding);

  const bloomKneeBinding = bloomFolder.addBinding(params.emitter.bloom, 'knee', {
    label: 'Soft knee',
    min: 0,
    max: 2,
    step: 0.01,
  });
  bloomKneeBinding.on('change', () => context.setBloom?.());
  bindings.push(bloomKneeBinding);

  const bloomIntensityBinding = bloomFolder.addBinding(params.emitter.bloom, 'intensity', {
    label: 'Intensity',
    min: 0,
    max: 5,
    step: 0.01,
  });
  bloomIntensityBinding.on('change', () => context.setBloom?.());
  bindings.push(bloomIntensityBinding);

  const bloomRadiusBinding = bloomFolder.addBinding(params.emitter.bloom, 'radius', {
    label: 'Radius',
    min: 0,
    max: 4,
    step: 0.01,
  });
  bloomRadiusBinding.on('change', () => context.setBloom?.());
  bindings.push(bloomRadiusBinding);

  const bloomQualityBinding = bloomFolder.addBinding(params.emitter.bloom, 'quality', {
    label: 'Quality',
    options: {
      Low: 'low',
      Medium: 'medium',
      High: 'high',
    },
  });
  bloomQualityBinding.on('change', () => context.setBloom?.());
  bindings.push(bloomQualityBinding);

  const textureFolder = emitterPane.addFolder({
    title: 'Texture',
    expanded: true,
  });

  let customTextureAvailable = false;
  let textureBinding = textureFolder.addBinding(params.emitter, 'texture', {
    None: 'none',
    'Particle atlas': 'atlas',
  });

  function refreshTextureBinding(): void {
    textureBinding.dispose();
    const i = bindings.indexOf(textureBinding);
    if (i >= 0) bindings.splice(i, 1);
    const options: Record<string, TextureChoice> = {
      None: 'none',
      'Particle atlas': 'atlas',
    };
    if (customTextureAvailable) options.Custom = 'custom';
    textureBinding = textureFolder.addBinding(params.emitter, 'texture', {
      options,
      label: 'Texture',
      index: 0,
    });
    bindings.push(textureBinding);
    textureBinding.on('change', () => context.applyTextureChoice?.());
  }
  refreshTextureBinding();

  const atlasColumnsBinding = textureFolder.addBinding(params.emitter.atlasLayout, 'columns', {
    step: 1,
    label: 'Atlas columns',
  });
  atlasColumnsBinding.on('change', () => context.recreateEmitter?.());
  bindings.push(atlasColumnsBinding);

  const atlasRowsBinding = textureFolder.addBinding(params.emitter.atlasLayout, 'rows', {
    step: 1,
    label: 'Atlas rows',
  });
  atlasRowsBinding.on('change', () => context.recreateEmitter?.());
  bindings.push(atlasRowsBinding);

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

  textureFolder.addButton({ title: 'Load texture' }).on('click', () => fileInput.click());
  textureFolder.addButton({ title: 'Clear custom texture' }).on('click', () => context.onClearCustomTexture?.());

  const modelFolder = emitterPane.addFolder({
    title: 'Model',
    expanded: false,
  });

  const objFileInput = document.createElement('input');
  objFileInput.type = 'file';
  objFileInput.accept = '.obj,text/plain';
  objFileInput.style.display = 'none';
  document.body.appendChild(objFileInput);
  objFileInput.addEventListener('change', () => {
    const file = objFileInput.files?.[0];
    if (file) {
      context.onLoadCustomObject?.(file);
      objFileInput.value = '';
    }
  });

  let customObjectAvailable = false;
  const customObjectState = { available: false };
  const customObjectBinding = modelFolder.addBinding(customObjectState, 'available', {
    label: 'Custom OBJ loaded',
    readonly: true,
  }) as unknown as { refresh: () => void; disabled: boolean };
  bindings.push(customObjectBinding as unknown as BindingApi);
  customObjectBinding.disabled = true;

  modelFolder.addButton({ title: 'Load OBJ' }).on('click', () => objFileInput.click());
  modelFolder.addButton({ title: 'Clear custom OBJ' }).on('click', () => context.onClearCustomObject?.());

  function setCustomTextureAvailable(available: boolean): void {
    if (available === customTextureAvailable) return;
    customTextureAvailable = available;
    refreshTextureBinding();
  }

  function setCustomObjectAvailable(available: boolean): void {
    if (available === customObjectAvailable) return;
    customObjectAvailable = available;
    customObjectState.available = available;
    customObjectBinding.refresh();
  }

  return {
    pane: emitterPane,
    bindings,
    setCustomTextureAvailable,
    setCustomObjectAvailable,
  };
};
