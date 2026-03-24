# AGENTS.md — Particular particle engine

This file gives LLMs and other AI agents enough context to work effectively in this repo.

## What this project is

**Particular** (`@nleidman/particular`) is a small **WebGL2** library for rendering particle effects. It is **not** a full game engine: it focuses on particle rendering with physics-style parameters (gravity, drag, velocity, etc.). It supports running in **workers** (OffscreenCanvas). Library is **verry** performance focused, meant to be runnable on the most low end devices, each change should adhere to this principle. The library is **work in progress**; APIs may change.

- **Stack**: TypeScript, WebGL2, ESM. Build: Vite. Lint/format: Biome.
- **Consumers**: Import from the package entry (see `src/index.ts`). The `demo` app is a local workspace that uses the built library.

## Repository layout

- **`src/`** — Library source. This is what gets built and published.
  - **`src/index.ts`** — Public API: re-exports from engine, emitter, entities, loaders, scene, math, texture renderer.
  - **`src/engine/engine.ts`** — Core: WebGL2 context, render loop, scenes, viewport, post-processing pipeline, time, and helpers (createProgramFromShaders, createFrameTexture, etc.).
  - **`src/scene/scene.ts`** — Scene: holds a `Camera`, `Light`, and a list of entities. Constructor: `new Scene({ camera, light? })`. Updates entity setup when camera or light moves.
  - **`src/entities/`** — Base `Entity` and `Body`. Entities implement `setup(camera, light)` and `draw(time: number)`.
  - **`src/emitter/`** — Particle emitter: `Emitter` (extends `Entity`), types (`EmitterOptions`, `ParticleBatchOptions`, `ParticleBatchProcessed`), vertex/fragment GLSL. Uses a **uniform buffer** (std140) for per-batch data and instanced drawing.
  - **`src/loaders/`** — `ObjectLoader` (OBJ → geometries), `TextureLoader`, and `Geometry` type.
  - **`src/noise/`** — Noise texture used by the emitter.
  - **`src/m3.ts`, `src/m4.ts`, `src/vec2.ts`, `src/vec3.ts`** — Math types used across the lib.
  - **`src/textureRenderer/quadRenderer.ts`** — Full-screen quad rendering (e.g. for post-processing).
- **`demo/`** — Demo app (npm workspace). See **Demo app** section below.
- **`vite.config.js`** (repo root) — Library build (Vite + vite-plugin-dts, vite-plugin-glsl). GLSL files are imported as strings.
- **`backlog/`** — Suggestions and pending improvements (e.g. design reviews, refactors). Used to track work that is not yet scheduled.

## Core concepts (for code edits)

1. **Engine** owns the WebGL2 context, resolution, pixel ratio, and render loop. Constructor: `Engine(canvas, { size: { x, y }, pixelRatio, beforeSetup? })`. It provides `createProgramFromShaders(vert, frag)`, `now()`, `resolution`, `pixelRatio`, `gl`, etc.
2. **Scene** holds a `Camera`, `Light`, and entities. `scene.add(entity)` and `scene.remove(entity)`. Entities receive `setup(camera, light)`; the scene’s draw path calls `entity.draw(time)` on each entity.
3. **Entity** is abstract: constructor `(engine, program)`, `draw(time)`, `setup(camera, light)`. The emitter sets up the **Camera** uniform block (binding point `Engine.BindingPoints.Camera`) in `setup()`.
4. **Emitter** is the main particle entity. Constructor: `Emitter(engine, EmitterOptions)`. Options include `orientation: 'billboard' | 'free'`, `texture`, `atlasLayout`, `modelGeometries`, `useLighting`, `useAlphaBlending`. It uses its own **Emitter** uniform block (binding point 1) for per-batch data. Particle batches are added with `emitter.emit(ParticleBatchOptions)`; batches are stored and drawn until they expire (`lifeTime` + `spawnDuration`). Physics-related options (gravity, v0, drag, etc.) are in **pixels** or **seconds** where documented in `src/emitter/types.ts`.
5. **ParticleBatchOptions** (see `src/emitter/types.ts` and README): `lifeTime`, `count`, `size`, `origin`, `v0`, `velocityBias`, `omega0`, `gravity`, `spawnDuration`, `Cd`, `Cr`, `density`, `area`, `mass`, `momentOfInertia`, `atlas` (offset + optional sweep), `scaleWithAge`, `spawnSize`. `processParticleBatchOptions()` fills defaults and derives `drag` and `angularDrag`.
6. **Coordinates**: Origin is top-left for 2D; emitter uses `engine.resolution.y - origin.y` for world position. Y is flipped for display.

## Conventions (when editing)

- **Formatting/lint**: Biome. Single quotes, 2 spaces, line width 140. Run format/lint from repo root.
- **GLSL**: Shaders live in `src/emitter/*.glsl` and are imported as raw strings (Vite GLSL plugin). Uniform block layout must match the `Float32Array` built in `Emitter.emit()` (std140; vec4 alignment).
- **Types**: Use the exported types from `src/emitter/types.ts` and `src/loaders/objectLoader/types.ts`. Don’t duplicate particle option shapes.
- **Public API**: Only export through `src/index.ts`. Don’t add new public entry points without updating `src/index.ts`.

## Common tasks

- **Add or change a particle batch parameter**: Update `ParticleBatchOptions` and `ParticleBatchProcessed` in `src/emitter/types.ts`, the `processParticleBatchOptions` and buffer construction in `src/emitter/emitter.ts`, and the **Emitter** uniform block + usage in `src/emitter/emitterVertexShader.glsl` (and fragment if needed). Keep std140 layout (vec4-aligned).
- **Change emitter rendering (e.g. lighting, blending)**: `Emitter` sets uniforms in `draw()` (e.g. `uBillboard`, `uUseLighting`, `uLightPosition`, blend state). Adjust there and in the shaders.
- **Add a new Entity type**: Subclass `Entity`, implement `draw(time)` and use `setup()` for Camera uniform block if needed. Register in a scene with `scene.add(entity)`.
- **Modify and expand functionality of a demo app**: Change and expand on a demo functionality, add new controls, handle tweakpane. 

## Demo app (`demo/`)

The demo is a Vite app that showcases the library: one canvas, one scene, one emitter. Click to spawn particle batches; Tweakpane controls all batch options and rendering toggles. Params are persisted to `localStorage`.

### Demo layout

- **`demo/package.json`** — Workspace; dependency `@nleidman/particular` is `file:..`. Scripts: `dev`, `build`, `preview`. Deps: Tweakpane, Vite, vite-plugin-glsl.
- **`demo/vite.config.js`** — `root: 'src'`, GLSL plugin. Build output: `dist/demo/dev`.
- **`demo/src/index.html`** — Single div `#root`, script `./script/main.ts`.
- **`demo/src/script/main.ts`** — Entry point: params (persistent), Tweakpane UI, `createDemoApp`, click-to-emit, global binding `change` → `updateBatches` + redraw, keyboard (P/Space pause, ArrowLeft/Right skip one frame), resize.
- **`demo/src/script/persistParams.ts`** — Single source of truth for demo **params shape**, persistence, and validation. `createPersistentParams()` returns a deep proxy that writes the full object to `localStorage` (key `particular-demo-params`) on any nested property set. See **Demo params (`Params`)** below. `resetParamsToDefaults(params)`, `getDefaultParams()`. Load path: `migrateLegacy` → `normalizeEmitterStorageShape` → `redistributeStoredParams` → `deepMerge` → `validateParams` (handles old flat keys, `emitter.particle` / `emitter.lightColor`, typo `lighing`, etc.).
- **`demo/src/script/compileConfig.ts`** — `compileConfig(params, originX, originY)` maps `Params` → `ParticleBatchOptions` (uses `params.particle` including nested `physics` and `atlas`).
- **`demo/src/script/demoApp.ts`** — Builds `Engine`, `Camera`, `Light`, `Scene`, `Emitter`, loads built-in atlas texture, custom texture/OBJ hooks, `recreateEmitter` / `applyTextureChoice` / camera updates.
- **`demo/src/tweakpane/index.ts`** — Composes panes; wires `TweakpaneUiContext` callbacks from `main.ts`.
- **`demo/src/tweakpane/panes/`** — `workspace`, `camera`, `lighting`, `emitter`, `particle`, `debug` (see **Tweakpane layout** below).
- **`demo/src/script/worker/worker.ts`** — Alternative worker-based entry (OffscreenCanvas + postMessage). **Out of sync with current library**: references `GaussianBlurShader`, `is2d`, and uses `scene` without defining it; Emitter now uses `orientation: 'billboard' | 'free'`. Update this file if you need worker demo support.
- **`demo/src/style/main.css`** — Styles (e.g. full-size canvas, floating Tweakpane).
- **`demo/src/img/`**, **`demo/src/*.obj`** — Assets (particle atlas, OBJ models). Main entry uses bundled `particle_atlas.png`; custom OBJ/texture blobs may be stored via IndexedDB helpers (see `customTextureStorage`, `customObjectStorage`, `workspaceBackgroundStorage`, `idbDemoAssets`).

### Demo params (`Params`)

Nested object persisted to `localStorage` (and suitable as a future “project file” JSON root):

- **`camera`** — `distance`, `type` (`'orthographic' | 'perspective'`).
- **`workspace`** — `backgroundColor` (float RGB); background **image** is separate (IndexedDB), not in `Params`.
- **`lighting`** — `color` (float RGB) for the scene `Light`.
- **`emitter`** — `orientation`, `useLighting`, `useAlphaBlending`, `texture` (`'none' | 'atlas' | 'custom'`), `atlasLayout` (`columns` / `rows` for how the bound texture is subdivided).
- **`particle`** — Batch/motion/material fields, plus nested **`physics`** (`Cd`, `Cr`, `ro`, `area`, `mass`, `momentOfInertia`) and **`atlas`** (frame offset `column`/`row`, sweep options). Atlas **layout** lives on `emitter`; atlas **usage** lives on `particle.atlas`.

### Tweakpane layout

- **Workspace** — Background color; load/clear background image.
- **Camera** — Distance, projection type.
- **Lighting** — `params.emitter.useLighting` + `params.lighting.color`.
- **Emitter** — Orientation, alpha blending; **Texture** folder (source, atlas columns/rows, custom image load/clear); **Model** folder (OBJ load/clear, collapsed by default).
- **Particle** — Lifetime, motion, material, **Physics** folder, **Atlas** folder (per-batch frame/sweep).
- **Debug** — Optional frame-time graph, noise preview, etc.

### Demo flow

1. **Params**: `params = createPersistentParams()`. Tweakpane bindings read/write `params`; nested sets auto-save to `localStorage`.
2. **compileConfig** (`compileConfig.ts`): `compileConfig(params, originX, originY)` → `ParticleBatchOptions`.
3. **Engine**: `new Engine(canvas, { size: container client size, pixelRatio: devicePixelRatio })`. Resize → `engine.resize(...)`.
4. **Scene**: `new Scene({ camera, light })` with `Camera(engine, type, distance)` and `Light` color from `params.lighting.color`.
5. **Emitter**: `Emitter` from `params.emitter` (orientation, `atlasLayout`, lighting/alpha flags). `recreateEmitter()` when orientation, atlas layout, or custom OBJ geometry changes; `applyTextureChoice()` when texture source changes; `setUseLighting` / `setUseAlphaBlending` / `setLightColor` / `applyCamera` for live toggles.
6. **Emit**: Click on container → `emit(compileConfig(params, clientX, clientY))`.
7. **Live batch edits**: Any binding `change` → `updateBatches(compileConfig(params, 0, 0))` + `engine.draw()` so paused mode shows updates.
8. **Keys**: P or Space → `engine.togglePause()`; ArrowLeft/Right → `engine.skip(±1000/60)`.

### Demo conventions and common tasks

- **Adding a new demo param**: (1) Add to `defaultParams` in `persistParams.ts` (types follow from `Params`). (2) Extend `validateParams` / migration if the field needs clamping or legacy import. (3) Update `resetParamsToDefaults`. (4) Map into `ParticleBatchOptions` in `compileConfig.ts` when it affects batches; otherwise only wire UI + app hooks. (5) Add Tweakpane bindings in the appropriate pane (`particle` for batch physics/material/atlas usage; `emitter` for texture/layout/model; `lighting` / `camera` / `workspace` as appropriate). If it affects `Emitter` construction, hook `recreateEmitter` (or equivalent) on `change`.
- **Run demo**: From repo root, `npm run dev` (or `npm -w demo run dev`); or from `demo/`, `npm run dev`. Vite serves with `root: demo/src`, so entry is `index.html` and `script/main.ts`.

## References

- **README.md** — User-facing install and usage, including full `ParticleBatchOptions` list.
- **Package**: `package.json` — name `@nleidman/particular`, exports from `dist/lib/index.js`, build via `vite build`.
