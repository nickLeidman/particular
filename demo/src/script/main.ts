import type { BindingApi, TpChangeEvent } from '@tweakpane/core';
import { createTweakpaneUi, type TweakpaneUiContext } from '../tweakpane';
import { compileConfig } from './compileConfig';
import { customObjectSlot } from './customObjectStorage';
import { customTextureSlot } from './customTextureStorage';
import { createDemoApp } from './demoApp';
import { ParamHistory } from './paramHistory';
import {
  assignValidatedParamsIntoLiveParams,
  createPersistentParams,
  parseProjectParamsJson,
  resetParamsToDefaults,
} from './persistParams';
import { downloadProjectParamsJson } from './projectFile';
import { workspaceBackgroundSlot } from './workspaceBackgroundStorage';
import { applyWorkspaceBackgroundColor, clearWorkspaceBackgroundImage, setWorkspaceBackgroundImageFromBlob } from './workspaceDom';

/** When true, shows GPU frame time graph and hooks into engine draw (adds per-frame overhead). Set false for production. */
const ENABLE_FRAME_TIME_GRAPH = false;

const params = createPersistentParams();
const uiContext: TweakpaneUiContext = {};

const {
  bindings,
  rootPanes,
  setKaDisabled,
  frameTimeCallbacks,
  setCustomTextureAvailable,
  setCustomObjectAvailable,
  setWorkspaceBackgroundAvailable,
} = createTweakpaneUi(params, uiContext, {
  compileConfig,
  enableFrameTimeGraph: ENABLE_FRAME_TIME_GRAPH,
});

const paramHistory = new ParamHistory(params);

const container = document.getElementById('root') as HTMLDivElement;

function applyWorkspace(): void {
  applyWorkspaceBackgroundColor(container, params);
}

applyWorkspace();

const app = createDemoApp(container, params, frameTimeCallbacks);

function refreshAfterBulkParamsChange(): void {
  for (const b of bindings) b.refresh();
  setKaDisabled(params.particle.useDiffuseAsAmbient);
  app.scene.light.setColor(params.lighting.color.r, params.lighting.color.g, params.lighting.color.b);
  app.applyCamera();
  applyWorkspace();
  app.recreateEmitter();
  app.applyTextureChoice();
  app.updateBatches(compileConfig(params, 0, 0));
  app.engine.draw();
}

uiContext.onReset = () => {
  paramHistory.beginBulkEdit({ saveUndoPoint: true });
  resetParamsToDefaults(params);
  refreshAfterBulkParamsChange();
  paramHistory.endBulkEdit();
};

uiContext.onExportProjectParams = () => {
  downloadProjectParamsJson(params);
};

uiContext.onImportProjectParams = (file: File) => {
  void file
    .text()
    .then(
      (text) => {
        paramHistory.beginBulkEdit({ saveUndoPoint: true });
        const validated = parseProjectParamsJson(text);
        assignValidatedParamsIntoLiveParams(params, validated);
        refreshAfterBulkParamsChange();
        paramHistory.endBulkEdit();
      },
      () => {
        window.alert('Could not read the selected file.');
      },
    )
    .catch((e: unknown) => {
      const message = e instanceof Error ? e.message : 'Invalid project file.';
      window.alert(message);
    });
};
uiContext.recreateEmitter = app.recreateEmitter;
uiContext.setUseLighting = app.setUseLighting;
uiContext.setLightColor = app.setLightColor;
uiContext.setUseAlphaBlending = app.setUseAlphaBlending;
uiContext.applyTextureChoice = app.applyTextureChoice;
uiContext.applyCamera = app.applyCamera;
uiContext.updateBatches = () => app.updateBatches(compileConfig(params, 0, 0));

uiContext.onLoadCustomTexture = (file: File) => {
  customTextureSlot
    .set(file)
    .then(() => app.setCustomTextureFromBlob(file))
    .then(() => {
      params.emitter.texture = 'custom';
      setCustomTextureAvailable(true);
      app.applyTextureChoice();
    });
};
uiContext.onClearCustomTexture = () => {
  if (params.emitter.texture === 'custom') params.emitter.texture = 'atlas';
  customTextureSlot.clear().then(() => {
    app.clearCustomTexture();
    setCustomTextureAvailable(false);
    app.applyTextureChoice();
  });
};
uiContext.onLoadCustomObject = (file: File) => {
  customObjectSlot
    .set(file)
    .then(() => app.setCustomObjectFromBlob(file))
    .then(() => setCustomObjectAvailable(true))
    .catch((error) => {
      console.error('Failed to load custom OBJ', error);
    });
};
uiContext.onClearCustomObject = () => {
  customObjectSlot.clear().then(() => {
    app.clearCustomObject();
    setCustomObjectAvailable(false);
  });
};
uiContext.setNoisePreviewVisible = app.setNoisePreviewVisible;

uiContext.applyWorkspace = applyWorkspace;
uiContext.onLoadWorkspaceBackground = (file: File) => {
  workspaceBackgroundSlot
    .set(file)
    .then(() => {
      setWorkspaceBackgroundImageFromBlob(container, file);
      setWorkspaceBackgroundAvailable(true);
    })
    .catch((error) => {
      console.error('Failed to save workspace background', error);
    });
};
uiContext.onClearWorkspaceBackground = () => {
  workspaceBackgroundSlot.clear().then(() => {
    clearWorkspaceBackgroundImage(container);
    setWorkspaceBackgroundAvailable(false);
  });
};

workspaceBackgroundSlot.get().then((blob) => {
  if (blob) {
    setWorkspaceBackgroundImageFromBlob(container, blob);
    setWorkspaceBackgroundAvailable(true);
  }
});

customTextureSlot.get().then((blob) => {
  if (blob) {
    app.setCustomTextureFromBlob(blob).then(() => setCustomTextureAvailable(true));
  }
});
customObjectSlot.get().then((blob) => {
  if (blob) {
    app
      .setCustomObjectFromBlob(blob)
      .then(() => setCustomObjectAvailable(true))
      .catch((error) => {
        console.error('Failed to restore custom OBJ', error);
        void customObjectSlot.clear();
      });
  }
});

app.engine.start();

for (const pane of rootPanes) {
  pane.on('change', (ev: TpChangeEvent) => {
    if (!ev.last) return;
    paramHistory.onUserCommit();
  });
}

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
  const target = event.target as HTMLElement | null;
  const inTextField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

  if (!inTextField && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    if (event.shiftKey) {
      if (paramHistory.redo()) {
        event.preventDefault();
        paramHistory.beginBulkEdit();
        refreshAfterBulkParamsChange();
        paramHistory.endBulkEdit();
      }
    } else if (paramHistory.undo()) {
      event.preventDefault();
      paramHistory.beginBulkEdit();
      refreshAfterBulkParamsChange();
      paramHistory.endBulkEdit();
    }
  }

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
