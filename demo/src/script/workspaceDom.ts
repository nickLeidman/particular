import type { Params } from './persistParams';

let backgroundImageObjectUrl: string | null = null;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Sets #root background color from workspace params (float RGB). */
export function applyWorkspaceBackgroundColor(root: HTMLElement, params: Params): void {
  const { r, g, b } = params.workspace.backgroundColor;
  root.style.backgroundColor = `rgb(${clampByte(r * 255)}, ${clampByte(g * 255)}, ${clampByte(b * 255)})`;
}

/** Shows a persisted or uploaded image behind the canvas. */
export function setWorkspaceBackgroundImageFromBlob(root: HTMLElement, blob: Blob): void {
  if (backgroundImageObjectUrl) {
    URL.revokeObjectURL(backgroundImageObjectUrl);
    backgroundImageObjectUrl = null;
  }
  backgroundImageObjectUrl = URL.createObjectURL(blob);
  root.style.backgroundImage = `url('${backgroundImageObjectUrl}')`;
  root.style.backgroundSize = 'cover';
  root.style.backgroundPosition = 'center';
}

/** Clears background image and revokes the object URL. */
export function clearWorkspaceBackgroundImage(root: HTMLElement): void {
  if (backgroundImageObjectUrl) {
    URL.revokeObjectURL(backgroundImageObjectUrl);
    backgroundImageObjectUrl = null;
  }
  root.style.backgroundImage = '';
}
