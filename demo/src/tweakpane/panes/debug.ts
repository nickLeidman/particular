import type { BindingApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import type { FrameTimeGraphCallbacks } from '../../script/frameTimeGraph';
import { setupFrameTimeGraph } from '../../script/frameTimeGraph';
import type { TweakpaneUiContext } from '..';

type ChangeableBindingApi = BindingApi & {
  on: (ev: string, fn: () => void) => void;
};

export type DebugPaneResult = {
  pane: Pane;
  bindings: BindingApi[];
  frameTimeCallbacks: FrameTimeGraphCallbacks | null;
};

export const createDebugPane = (
  context: TweakpaneUiContext,
  options?: { enableFrameTimeGraph?: boolean },
): DebugPaneResult => {
  const debugPane = new Pane({ title: 'Debug' });
  const bindings: BindingApi[] = [];

  const frameTimeCallbacks = options?.enableFrameTimeGraph === true ? setupFrameTimeGraph(debugPane) : null;

  const debugState = { noisePreview: false };
  const noisePreviewBinding = debugPane.addBinding(debugState, 'noisePreview', {
    label: 'Noise preview',
  }) as ChangeableBindingApi;
  noisePreviewBinding.on('change', () => context.setNoisePreviewVisible?.(debugState.noisePreview));
  bindings.push(noisePreviewBinding);

  return { pane: debugPane, bindings, frameTimeCallbacks };
};
