import type { BindingApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import type { Params } from '../../script/persistParams';
import type { TweakpaneUiContext } from '..';

export const createEmitterPane = (params: Params, context: TweakpaneUiContext): { pane: Pane; bindings: BindingApi[] } => {
  const emitterPane = new Pane({ title: 'Emitter' });
  const bindings: BindingApi[] = [];

  const orientationBinding = emitterPane.addBinding(params, 'orientation', {
    options: { Billboard: 'billboard', Free: 'free' },
    label: 'Orientation',
  });
  orientationBinding.on('change', () => context.recreateEmitter?.());
  bindings.push(orientationBinding);

  const useAlphaBlendingBinding = emitterPane.addBinding(params, 'useAlphaBlending', {
    label: 'Alpha blending',
  });
  useAlphaBlendingBinding.on('change', () => context.setUseAlphaBlending?.());
  bindings.push(useAlphaBlendingBinding);

  const atlasFolder = emitterPane.addFolder({ title: 'Atlas', expanded: false });

  const atlasColumnsBinding = atlasFolder.addBinding(params.atlasLayout, 'columns', {
    step: 1,
    label: 'columns',
  });
  atlasColumnsBinding.on('change', () => context.recreateEmitter?.());
  bindings.push(atlasColumnsBinding);

  const atlasRowsBinding = atlasFolder.addBinding(params.atlasLayout, 'rows', {
    step: 1,
    label: 'rows',
  });
  atlasRowsBinding.on('change', () => context.recreateEmitter?.());
  bindings.push(atlasRowsBinding);

  bindings.push(
    atlasFolder.addBinding(params.atlas, 'column', {
      step: 1,
      label: 'offset column',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.atlas, 'row', {
      step: 1,
      label: 'offset row',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.atlas, 'sweepBy', {
      options: { row: 'row', column: 'column' },
      label: 'sweep by',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.atlas, 'sweepStepTime', {
      min: 0,
      max: 200,
      step: 1,
      label: 'sweep step (ms)',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.atlas, 'sweepStepCount', {
      min: 1,
      max: 32,
      step: 1,
      label: 'sweep steps',
    }),
  );

  return {
    pane: emitterPane,
    bindings,
  };
};
