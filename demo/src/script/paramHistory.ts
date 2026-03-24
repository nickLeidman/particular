import type { Params } from './persistParams';
import { assignValidatedParamsIntoLiveParams } from './persistParams';

const DEFAULT_MAX_UNDO = 80;

function cloneParamsSnapshot(p: Params): Params {
  return JSON.parse(JSON.stringify(p)) as Params;
}

function paramsJsonStable(p: Params): string {
  return JSON.stringify(p);
}

export class ParamHistory {
  private readonly maxUndo: number;
  private readonly undoStack: Params[] = [];
  private readonly redoStack: Params[] = [];
  private baseline: Params;
  private suppressDepth = 0;

  constructor(
    private readonly params: Params,
    options?: { maxUndo?: number },
  ) {
    this.maxUndo = options?.maxUndo ?? DEFAULT_MAX_UNDO;
    this.baseline = cloneParamsSnapshot(params);
  }

  private trimUndo(): void {
    while (this.undoStack.length > this.maxUndo) {
      this.undoStack.shift();
    }
  }

  /** Call when Tweakpane emits `change` with `ev.last === true`. */
  onUserCommit(): void {
    if (this.suppressDepth > 0) return;
    if (paramsJsonStable(this.baseline) === paramsJsonStable(this.params)) return;
    this.undoStack.push(this.baseline);
    this.trimUndo();
    this.baseline = cloneParamsSnapshot(this.params);
    this.redoStack.length = 0;
  }

  /**
   * Wrap bulk mutations (reset, import). Optionally push current state onto undo first.
   * Nesting increments suppress depth so `onUserCommit` does not run during assign/refresh.
   */
  beginBulkEdit(opts?: { saveUndoPoint?: boolean }): void {
    this.suppressDepth += 1;
    if (opts?.saveUndoPoint) {
      this.undoStack.push(cloneParamsSnapshot(this.params));
      this.trimUndo();
      this.redoStack.length = 0;
    }
  }

  endBulkEdit(): void {
    this.baseline = cloneParamsSnapshot(this.params);
    this.suppressDepth = Math.max(0, this.suppressDepth - 1);
  }

  undo(): boolean {
    if (this.suppressDepth > 0 || this.undoStack.length === 0) return false;
    this.suppressDepth += 1;
    this.redoStack.push(cloneParamsSnapshot(this.params));
    const prev = this.undoStack.pop();
    if (!prev) {
      this.redoStack.pop();
      this.suppressDepth -= 1;
      return false;
    }
    assignValidatedParamsIntoLiveParams(this.params, prev);
    this.baseline = cloneParamsSnapshot(this.params);
    this.suppressDepth -= 1;
    return true;
  }

  redo(): boolean {
    if (this.suppressDepth > 0 || this.redoStack.length === 0) return false;
    this.suppressDepth += 1;
    this.undoStack.push(cloneParamsSnapshot(this.params));
    const next = this.redoStack.pop();
    if (!next) {
      this.undoStack.pop();
      this.suppressDepth -= 1;
      return false;
    }
    assignValidatedParamsIntoLiveParams(this.params, next);
    this.baseline = cloneParamsSnapshot(this.params);
    this.suppressDepth -= 1;
    return true;
  }
}
