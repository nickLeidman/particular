import type { BindingApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import type { Params } from '../../script/persistParams';
import type { TweakpaneUiContext } from '..';

export const createLightingPane = (params: Params, context: TweakpaneUiContext): { pane: Pane; bindings: BindingApi[] } => {
  const lightingPane = new Pane({ title: 'Lighting' });

  const useLightingBinding = lightingPane.addBinding(params, 'useLighting', {
    label: 'Use lighting',
  });
  useLightingBinding.on('change', () => context.setUseLighting?.());

  const lightColorBinding = lightingPane.addBinding(params, 'lightColor', {
    color: { type: 'float' },
    label: 'Color',
  });
  lightColorBinding.on('change', () => context.setLightColor?.());

  return { pane: lightingPane, bindings: [useLightingBinding, lightColorBinding] };
};
