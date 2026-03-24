import type { ParticleBatchOptions } from '@nleidman/particular';
import type { BindingApi } from '@tweakpane/core';
import type { FrameTimeGraphCallbacks } from '../script/frameTimeGraph';
import type { Params } from '../script/persistParams';
import { createCameraPane } from './panes/camera';
import { createDebugPane } from './panes/debug';
import { createEmitterPane } from './panes/emitter';
import { createLightingPane } from './panes/lighting';
import { createParticlePane } from './panes/particle';
import { createWorkspacePane } from './panes/workspace';

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
  /** Called when user selects an OBJ file via "Load OBJ". */
  onLoadCustomObject?: (file: File) => void;
  /** Called when user clicks "Clear custom OBJ". */
  onClearCustomObject?: () => void;
  /** Toggle debug overlay (e.g. noise preview). */
  setNoisePreviewVisible?: (visible: boolean) => void;
  /** Apply workspace background color (and keep image if any). */
  applyWorkspace?: () => void;
  onLoadWorkspaceBackground?: (file: File) => void;
  onClearWorkspaceBackground?: () => void;
};

export type TweakpaneUiResult = {
  bindings: BindingApi[];
  setKaDisabled: (disabled: boolean) => void;
  frameTimeCallbacks: FrameTimeGraphCallbacks | null;
  /** Call when a custom texture is saved or removed so the texture picker can show/hide "Custom". */
  setCustomTextureAvailable: (available: boolean) => void;
  /** Call when a custom OBJ is saved or removed to refresh clear button state. */
  setCustomObjectAvailable: (available: boolean) => void;
  setWorkspaceBackgroundAvailable: (available: boolean) => void;
};

export function createTweakpaneUi(
  params: Params,
  context: TweakpaneUiContext,
  options: {
    compileConfig: (p: Params, x: number, y: number) => ParticleBatchOptions;
    enableFrameTimeGraph?: boolean;
  },
): TweakpaneUiResult {
  const bindings: BindingApi[] = [];

  const wrapper = document.createElement('div');
  wrapper.classList.add('pane-wrapper');
  document.body.appendChild(wrapper);

  const container = document.createElement('div');
  container.classList.add('pane-container');
  wrapper.appendChild(container);

  const { pane: workspacePane, bindings: workspaceBindings, setWorkspaceBackgroundAvailable } = createWorkspacePane(params, context);
  container.appendChild(workspacePane.element);
  for (const binding of workspaceBindings) {
    bindings.push(binding);
  }

  const { pane: cameraPane, bindings: cameraBindings } = createCameraPane(params, context);
  container.appendChild(cameraPane.element);
  for (const binding of cameraBindings) {
    bindings.push(binding);
  }

  const { pane: lightingPane, bindings: lightingBindings } = createLightingPane(params, context);
  container.appendChild(lightingPane.element);
  for (const binding of lightingBindings) {
    bindings.push(binding);
  }

  const { pane: emitterPane, bindings: emitterBindings } = createEmitterPane(params, context);
  container.appendChild(emitterPane.element);
  for (const binding of emitterBindings) {
    bindings.push(binding);
  }

  const {
    pane: particlePane,
    bindings: particleBindings,
    setKaDisabled,
    setCustomTextureAvailable,
    setCustomObjectAvailable,
  } = createParticlePane(params, context, { compileConfig: options.compileConfig });
  container.appendChild(particlePane.element);
  for (const binding of particleBindings) {
    bindings.push(binding);
  }

  const {
    pane: debugPane,
    bindings: debugBindings,
    frameTimeCallbacks,
  } = createDebugPane(context, {
    enableFrameTimeGraph: options.enableFrameTimeGraph,
  });
  container.appendChild(debugPane.element);
  for (const binding of debugBindings) {
    bindings.push(binding);
  }

  return {
    bindings,
    setKaDisabled,
    frameTimeCallbacks,
    setCustomTextureAvailable,
    setCustomObjectAvailable,
    setWorkspaceBackgroundAvailable,
  };
}
