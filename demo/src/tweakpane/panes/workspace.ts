import type { BindingApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import type { Params } from '../../script/persistParams';
import type { TweakpaneUiContext } from '..';

type ChangeableBindingApi = BindingApi & {
  on: (ev: string, fn: () => void) => void;
};

export type WorkspacePaneResult = {
  pane: Pane;
  bindings: BindingApi[];
  setWorkspaceBackgroundAvailable: (available: boolean) => void;
};

export const createWorkspacePane = (params: Params, context: TweakpaneUiContext): WorkspacePaneResult => {
  const workspacePane = new Pane({ title: 'Workspace' });
  const bindings: BindingApi[] = [];

  const colorBinding = workspacePane.addBinding(params.workspace, 'backgroundColor', {
    color: { type: 'float' },
    label: 'Background',
  }) as ChangeableBindingApi;
  colorBinding.on('change', () => context.applyWorkspace?.());
  bindings.push(colorBinding);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      context.onLoadWorkspaceBackground?.(file);
      fileInput.value = '';
    }
  });

  workspacePane.addButton({ title: 'Load background image' }).on('click', () => fileInput.click());

  const removeImageBtn = workspacePane.addButton({ title: 'Remove background image' });
  removeImageBtn.element.style.display = 'none';
  removeImageBtn.on('click', () => context.onClearWorkspaceBackground?.());

  workspacePane.addBlade({ view: 'separator' });

  workspacePane.addButton({ title: 'Reset EVERYTHING to defaults' }).on('click', () => {
    context.onReset?.();
  });

  function setWorkspaceBackgroundAvailable(available: boolean): void {
    removeImageBtn.element.style.display = available ? '' : 'none';
  }

  return { pane: workspacePane, bindings, setWorkspaceBackgroundAvailable };
};
