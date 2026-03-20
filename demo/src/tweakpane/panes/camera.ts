import type { BindingApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import type { Params } from '../../script/persistParams';
import type { TweakpaneUiContext } from '..';

export const createCameraPane = (params: Params, context: TweakpaneUiContext): { pane: Pane; bindings: BindingApi[] } => {
  const cameraPane = new Pane({ title: 'Camera' });

  const cameraDistanceBinding = cameraPane.addBinding(params.camera, 'distance', {
    min: 100,
    max: 20000,
    step: 100,
    label: 'distance',
  });
  cameraDistanceBinding.on('change', () => context.applyCamera?.());

  const cameraTypeBinding = cameraPane.addBinding(params.camera, 'type', {
    options: { Perspective: 'perspective', Orthographic: 'orthographic' },
    label: 'type',
  });
  cameraTypeBinding.on('change', () => context.applyCamera?.());

  return { pane: cameraPane, bindings: [cameraDistanceBinding, cameraTypeBinding] };
};
