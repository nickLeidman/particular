# Engine / Scene / Emitter Performance Review

Idle fullscreen (no particles): Firefox ~15%, Chrome ~6% GPU 3D. Library: `src/engine`, `src/scene`, `src/emitter`, `src/entities`. Demo: `demo/src/script/main.ts`, `frameTimeGraph.ts`.

---

## 1. Lazy post-processing FBO and textures

**Action:** Allocate `textureA`, `textureB`, and `buffer` only when the first post-processor is attached (or when post-processing is enabled). In `resize()`, recreate them only if they already exist.

**Reason:** With empty `postProcessingPipeline` (demo default) these are never used but are allocated at full resolution (RGBA16F + depth/stencil) in constructor and on every resize.

**Code:** `src/engine/engine.ts` — constructor, `resize()`, `attachPostProcessor()`, draw path.

---

## 2. Frame time graph / GPU timer

**Action:** Set `ENABLE_FRAME_TIME_GRAPH = false` by default or when not profiling (`demo/src/script/main.ts`). Optionally enable timer only via a debug/profiling flag.

**Reason:** When enabled: `beginQuery`/`endQuery` every frame and `poll()` (getParameter, getQueryParameter) add driver overhead and possible CPU–GPU sync.

**Code:** `demo/src/script/main.ts`, `demo/src/script/frameTimeGraph.ts`, `src/gpuTimer/gpuTimer.ts`.

---

## 3. Frame time graph: throttle and cache styles

**Action:** Throttle graph redraws (e.g. every N frames or 100 ms). Cache `getComputedStyle(paneElement)` and invalidate only when pane/theme might have changed. Optionally redraw only when the pane is visible.

**Reason:** Full Canvas 2D redraw and getComputedStyle every frame add CPU and can affect compositing.

**Code:** `demo/src/script/frameTimeGraph.ts` — `draw()`, `onAfterDraw`.

---

## 4. Idle loop throttling (optional)

**Action:** Consider an opt-in mode to throttle or pause the rAF loop when no particles and no post-processing (e.g. lower frequency or pause until next interaction). Document as opt-in to avoid surprising consumers.

**Reason:** Loop runs at display rate; when idle, timer + graph still run every frame.

---

## Code references

| Item              | Location |
|-------------------|----------|
| Engine draw/clear/resize | `src/engine/engine.ts` |
| Scene hasActiveContent   | `src/scene/scene.ts` |
| Entity/Emitter hasActiveContent | `src/entities/entity/entity.ts`, `src/emitter/emitter.ts` |
| Frame time graph        | `demo/src/script/frameTimeGraph.ts`, `demo/src/script/main.ts` |
| GPU timer               | `src/gpuTimer/gpuTimer.ts` |
