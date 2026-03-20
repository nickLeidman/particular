import type { BindingApi } from '@tweakpane/core';
import { createTweakpaneUi, type TweakpaneUiContext } from '../tweakpane';
import { compileConfig } from './compileConfig';
import { clearCustomObject, getCustomObject, setCustomObject } from './customObjectStorage';
import { clearCustomTexture, getCustomTexture, setCustomTexture } from './customTextureStorage';
import { createDemoApp } from './demoApp';
import { createPersistentParams, resetParamsToDefaults } from './persistParams';

/** When true, shows GPU frame time graph and hooks into engine draw (adds per-frame overhead). Set false for production. */
const ENABLE_FRAME_TIME_GRAPH = false;

const params = createPersistentParams();
const uiContext: TweakpaneUiContext = {};

const { bindings, setKaDisabled, frameTimeCallbacks, setCustomTextureAvailable, setCustomObjectAvailable } = createTweakpaneUi(
  params,
  uiContext,
  {
    compileConfig,
    enableFrameTimeGraph: ENABLE_FRAME_TIME_GRAPH,
  },
);

const container = document.getElementById('root') as HTMLDivElement;
const app = createDemoApp(container, params, frameTimeCallbacks);

uiContext.onReset = () => {
  resetParamsToDefaults(params);
  for (const b of bindings) b.refresh();
  setKaDisabled(params.particle.useDiffuseAsAmbient);
  app.scene.light.setColor(params.lightColor.r, params.lightColor.g, params.lightColor.b);
  app.applyCamera();
  app.engine.draw();
};
uiContext.recreateEmitter = app.recreateEmitter;
uiContext.setUseLighting = app.setUseLighting;
uiContext.setLightColor = app.setLightColor;
uiContext.setUseAlphaBlending = app.setUseAlphaBlending;
uiContext.applyTextureChoice = app.applyTextureChoice;
uiContext.applyCamera = app.applyCamera;
uiContext.updateBatches = () => app.updateBatches(compileConfig(params, 0, 0));

uiContext.onLoadCustomTexture = (file: File) => {
  setCustomTexture(file)
    .then(() => app.setCustomTextureFromBlob(file))
    .then(() => {
      params.texture = 'custom';
      setCustomTextureAvailable(true);
      app.applyTextureChoice();
    });
};
uiContext.onClearCustomTexture = () => {
  if (params.texture === 'custom') params.texture = 'atlas';
  clearCustomTexture().then(() => {
    app.clearCustomTexture();
    setCustomTextureAvailable(false);
    app.applyTextureChoice();
  });
};
uiContext.onLoadCustomObject = (file: File) => {
  setCustomObject(file)
    .then(() => app.setCustomObjectFromBlob(file))
    .then(() => setCustomObjectAvailable(true))
    .catch((error) => {
      console.error('Failed to load custom OBJ', error);
    });
};
uiContext.onClearCustomObject = () => {
  clearCustomObject().then(() => {
    app.clearCustomObject();
    setCustomObjectAvailable(false);
  });
};
uiContext.setNoisePreviewVisible = app.setNoisePreviewVisible;

getCustomTexture().then((blob) => {
  if (blob) {
    app.setCustomTextureFromBlob(blob).then(() => setCustomTextureAvailable(true));
  }
});
getCustomObject().then((blob) => {
  if (blob) {
    app
      .setCustomObjectFromBlob(blob)
      .then(() => setCustomObjectAvailable(true))
      .catch((error) => {
        console.error('Failed to restore custom OBJ', error);
        void clearCustomObject();
      });
  }
});

app.engine.start();

// Apply param changes to existing batches and redraw on any pane change (so updates are visible when paused)
bindings.forEach((b) => {
  void (b as BindingApi & { on: (ev: string, fn: () => void) => void }).on('change', () => {
    app.updateBatches(compileConfig(params, 0, 0));
    app.engine.draw();
  });
});

container.addEventListener('click', (event: MouseEvent) => {
  app.emit(compileConfig(params, event.clientX, event.clientY));
});

window.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'p' || event.key === ' ') {
    event.preventDefault();
    app.engine.togglePause();
  }
  if (event.key === 'ArrowLeft') {
    app.engine.skip(-1000 / 60);
  }
  if (event.key === 'ArrowRight') {
    app.engine.skip(1000 / 60);
  }
});

window.addEventListener('resize', () => {
  app.engine.resize(container.clientWidth, container.clientHeight);
});
