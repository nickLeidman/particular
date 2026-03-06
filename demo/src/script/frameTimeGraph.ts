/**
 * Frame time graph: custom canvas with Y-axis (ms), 0–16 ms cap, 4 px/ms.
 * Uses GPU timer (EXT_disjoint_timer_query_webgl2) only; no CPU fallback.
 * Canvas 2D does not resolve CSS var(); colors are read via getComputedStyle from the pane.
 */

/** Minimal engine shape needed for GPU timer; avoids importing full Engine from package. */
interface EngineWithTimer {
  timer: {
    supported: boolean;
    pendingCount: number;
    begin: (label: string) => { q: WebGLQuery; label: string } | null;
    end: (handle: { q: WebGLQuery; label: string } | null) => void;
    poll: (onResult?: (label: string, nanoseconds: number) => void) => void;
  };
}

const HISTORY_LENGTH = 120;
const Y_MAX_MS = 16;
const PX_PER_MS = 4;
const GRAPH_HEIGHT = Y_MAX_MS * PX_PER_MS;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 8;
const CANVAS_HEIGHT = GRAPH_HEIGHT + PADDING_TOP + PADDING_BOTTOM;

function createFrameTimeGraphRow(paneElement: HTMLElement, frameTimeHistory: number[]): { row: HTMLDivElement; draw: () => void } {
  const row = document.createElement('div');
  row.className = 'frame-time-graph-row';

  const label = document.createElement('div');
  label.className = 'frame-time-graph-label';
  label.textContent = 'GPU time (ms)';

  const canvas = document.createElement('canvas');
  canvas.className = 'frame-time-graph-canvas';
  canvas.height = CANVAS_HEIGHT;

  row.appendChild(label);
  row.appendChild(canvas);

  function getGraphColors() {
    const s = getComputedStyle(paneElement);
    return {
      background: s.getPropertyValue('--tp-monitor-background-color').trim() || 'hsl(230, 20%, 8%)',
      axis: s.getPropertyValue('--tp-label-foreground-color').trim() || 'hsl(230, 12%, 48%)',
      curve: s.getPropertyValue('--tp-button-background-color').trim() || 'hsl(230, 10%, 80%)',
    };
  }

  function draw() {
    const w = Math.max(canvas.clientWidth || 0, 80);
    const h = canvas.height;
    if (w <= 0) return;

    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const colors = getGraphColors();
    const axisWidth = 32;
    const graphLeft = axisWidth;
    const graphW = w - graphLeft;

    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, w, h);

    const graphTop = PADDING_TOP;
    const graphBottom = h - PADDING_BOTTOM;

    // Faint 0 ms reference line (horizontal)
    ctx.strokeStyle = colors.axis;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(graphLeft, graphBottom);
    ctx.lineTo(graphLeft + graphW, graphBottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Y-axis: 4 px/ms, cap 16 ms; ticks every 4 ms
    ctx.strokeStyle = colors.axis;
    ctx.fillStyle = colors.axis;
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = [0, 4, 8, 12, 16];
    for (const ms of yTicks) {
      const y = graphBottom - ms * PX_PER_MS;
      ctx.beginPath();
      ctx.moveTo(graphLeft - 4, y);
      ctx.lineTo(graphLeft, y);
      ctx.stroke();
      ctx.fillText(`${ms}`, graphLeft - 6, y);
    }
    ctx.beginPath();
    ctx.moveTo(graphLeft, graphTop);
    ctx.lineTo(graphLeft, graphBottom);
    ctx.stroke();

    // Curve: spans full graph width; 1px line; y = 4 px/ms, values > 16 ms clamped to top
    if (frameTimeHistory.length >= 2 && graphW >= 1) {
      const numSamples = frameTimeHistory.length;
      const stepX = numSamples > 1 ? graphW / (numSamples - 1) : 0;
      ctx.strokeStyle = colors.curve;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < numSamples; i++) {
        const x = graphLeft + i * stepX;
        const ms = Math.min(frameTimeHistory[i] ?? 0, Y_MAX_MS);
        const y = graphBottom - ms * PX_PER_MS;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  const resizeObserver = new ResizeObserver(() => draw());
  resizeObserver.observe(canvas);

  return { row, draw };
}

export type FrameTimeGraphCallbacks = {
  onBeforeDraw: (engine: EngineWithTimer) => void;
  onAfterDraw: (engine: EngineWithTimer) => void;
};

/**
 * Creates the frame time graph row, inserts it into the pane, and returns
 * callbacks to pass to Engine. Callbacks use engine.timer (GPU) only.
 */
export function setupFrameTimeGraph(pane: { element: HTMLElement }): FrameTimeGraphCallbacks {
  const frameTimeHistory: number[] = [];
  let pendingGpuHandle: { q: WebGLQuery; label: string } | null = null;
  let labelEl: HTMLElement | null = null;

  const { row, draw } = createFrameTimeGraphRow(pane.element, frameTimeHistory);
  labelEl = row.querySelector('.frame-time-graph-label') as HTMLElement;

  const insertBefore = pane.element.children[1] ?? null;
  if (insertBefore) pane.element.insertBefore(row, insertBefore);
  else pane.element.appendChild(row);

  function pushMsAndDraw(ms: number) {
    frameTimeHistory.push(ms);
    if (frameTimeHistory.length > HISTORY_LENGTH) frameTimeHistory.shift();
    draw();
  }

  return {
    onBeforeDraw: (engine: EngineWithTimer) => {
      if (!engine.timer.supported) {
        if (labelEl) labelEl.textContent = 'GPU time (ms) — not supported';
        return;
      }
      // Throttle: only begin when few pending (some drivers limit simultaneous queries)
      if (engine.timer.pendingCount < 4) {
        pendingGpuHandle = engine.timer.begin('frame');
      }
    },
    onAfterDraw: (engine: EngineWithTimer) => {
      if (engine.timer.supported) {
        if (labelEl) labelEl.textContent = 'GPU time (ms)';
        engine.timer.end(pendingGpuHandle);
        pendingGpuHandle = null;
        engine.timer.poll((_label, ns) => {
          pushMsAndDraw(ns / 1e6);
        });
      }
      draw();
    },
  };
}
