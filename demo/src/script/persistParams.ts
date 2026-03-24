import type { EmitterOrientation } from '@nleidman/particular';

const STORAGE_KEY = 'particular-demo-params';

/** Written to exported JSON for future migrations; stripped before normalize/merge. */
export const PARTICULAR_DEMO_PROJECT_VERSION = 1 as const;
export const PARTICULAR_DEMO_PROJECT_VERSION_KEY = 'particularDemoProjectVersion' as const;

export type TextureChoice = 'none' | 'atlas' | 'custom';

/** Specular exponent (Ns) limited to powers of two for cheaper pow() on GPU. */
export const Ns_POW2 = [1, 2, 4, 8, 16, 32, 64, 128, 256] as const;
export type NsValue = (typeof Ns_POW2)[number];

function nearestPowerOfTwo(n: number): NsValue {
  if (n <= 1) return 1;
  if (n >= 256) return 256;
  let prev = 1;
  for (const p of Ns_POW2) {
    if (n <= p) return n - prev <= p - n ? (prev as NsValue) : (p as NsValue);
    prev = p;
  }
  return 256;
}

/**
 * Keys that belonged under `emitter` in older stored shapes.
 * `particle`, `physics`, `atlas` are hoisted to `params.particle` (with physics/atlas nested) after load.
 */
const EMITTER_STORAGE_KEYS = [
  'orientation',
  'useLighting',
  'lightColor',
  'useAlphaBlending',
  'texture',
  'atlasLayout',
  'particle',
  'physics',
  'atlas',
] as const;

const defaultParams = {
  camera: {
    distance: 10000,
    type: 'perspective' as 'orthographic' | 'perspective',
  },
  /** Page chrome behind the canvas (color in localStorage; optional image in IndexedDB). */
  workspace: {
    backgroundColor: { r: 65 / 255, g: 105 / 255, b: 225 / 255 },
  },
  /** Scene light color (separate from emitter `useLighting` toggle). */
  lighting: {
    color: { r: 0.8, g: 0.8, b: 0.8 },
  },
  emitter: {
    orientation: 'free' as EmitterOrientation,
    useLighting: true,
    useAlphaBlending: false,
    texture: 'none' as TextureChoice,
    atlasLayout: { columns: 1, rows: 1 },
  },
  particle: {
    lifeTime: 800,
    count: 100,
    size: 10,
    scale: { x: 2, y: 1, z: 1 },
    v0: { x: 7000, y: 7000, z: 7000 },
    velocityBias: { x: 0, y: 0.8, z: 0 },
    velocitySpread: { x: 1, y: 1, z: 1 },
    omega0: 7,
    randomStartRotation: false,
    gravity: { x: 0, y: -500, z: 0 },
    spawnDuration: 200,
    spawnSize: 60,
    scaleWithAge: 1,
    swayStrength: 0,
    swayTimeScale: 0.04,
    useDiffuseAsAmbient: true,
    Ka: { r: 0.75, g: 0.68, b: 0.098 },
    Kd: { r: 0.75, g: 0.68, b: 0.098 },
    Ks: { r: 1, g: 1, b: 1 },
    Ns: 8,
    physics: {
      Cd: 5,
      Cr: 0.9,
      ro: 1.4,
      area: 500,
      mass: 0.000109,
      momentOfInertia: 0.000326,
    },
    atlas: {
      column: 0,
      row: 0,
      sweepBy: 'row' as 'row' | 'column',
      sweepStepTime: 1000 / 60,
      sweepStepCount: 1,
    },
  },
};

export type Params = typeof defaultParams;

export function getDefaultParams(): Params {
  return JSON.parse(JSON.stringify(defaultParams));
}

/** Mutate target with values from source (plain objects merged recursively). */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const s = source[key];
    if (s === null || s === undefined) continue;
    const t = target[key];
    if (
      typeof s === 'object' &&
      s !== null &&
      !Array.isArray(s) &&
      Object.getPrototypeOf(s) === Object.prototype &&
      typeof t === 'object' &&
      t !== null &&
      !Array.isArray(t) &&
      Object.getPrototypeOf(t) === Object.prototype
    ) {
      deepMerge(t as Record<string, unknown>, s as Record<string, unknown>);
    } else {
      (target as Record<string, unknown>)[key] = s;
    }
  }
}

/** Flattened `emitter` for legacy localStorage (pre-`emitter` nesting). */
function normalizeEmitterStorageShape(parsed: Record<string, unknown>): void {
  const existing = parsed.emitter;
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    const em = existing as Record<string, unknown>;
    for (const k of EMITTER_STORAGE_KEYS) {
      if (k in parsed && !(k in em)) {
        em[k] = parsed[k];
      }
      delete parsed[k];
    }
    return;
  }
  const emitter: Record<string, unknown> = {};
  for (const k of EMITTER_STORAGE_KEYS) {
    if (k in parsed) {
      emitter[k] = parsed[k];
      delete parsed[k];
    }
  }
  if (Object.keys(emitter).length > 0) {
    parsed.emitter = emitter;
  }
}

/** Normalize typo, scene light location, and particle subtree after emitter flattening / legacy saves. */
function redistributeStoredParams(parsed: Record<string, unknown>): void {
  if (parsed.lighing && typeof parsed.lighing === 'object' && !parsed.lighting) {
    parsed.lighting = parsed.lighing;
  }
  delete parsed.lighing;

  const em = parsed.emitter as Record<string, unknown> | undefined;
  if (!em || typeof em !== 'object' || Array.isArray(em)) return;

  if (em.lightColor) {
    if (!parsed.lighting || typeof parsed.lighting !== 'object') parsed.lighting = {};
    const L = parsed.lighting as Record<string, unknown>;
    if (!L.color) L.color = em.lightColor;
    delete em.lightColor;
  }

  const ep = em.particle as Record<string, unknown> | undefined;
  if (ep) {
    const rootP = parsed.particle as Record<string, unknown> | undefined;
    if (!parsed.particle) {
      parsed.particle = ep;
    } else if (rootP) {
      deepMerge(rootP, ep);
    }
    delete em.particle;
  }

  const targetP = parsed.particle as Record<string, unknown> | undefined;
  if (!targetP) return;

  if (em.physics) {
    if (!targetP.physics) targetP.physics = em.physics;
    else deepMerge(targetP.physics as Record<string, unknown>, em.physics as Record<string, unknown>);
    delete em.physics;
  }
  if (em.atlas) {
    if (!targetP.atlas) targetP.atlas = em.atlas;
    else deepMerge(targetP.atlas as Record<string, unknown>, em.atlas as Record<string, unknown>);
    delete em.atlas;
  }
}

/** One-time migration of old localStorage shapes into current shape. */
function migrateLegacy(parsed: Record<string, unknown>): void {
  if ((parsed.mode === '2d' || parsed.mode === '3d') && parsed.orientation === undefined) {
    parsed.orientation = parsed.mode === '2d' ? 'billboard' : 'free';
  }
  const e = parsed.emitter as Record<string, unknown> | undefined;
  const p = (e?.particle ?? parsed.particle) as Record<string, unknown> | undefined;
  if (p && ('gravityX' in p || 'gravityY' in p || 'gravityZ' in p) && !p.gravity) {
    p.gravity = {
      x: (p.gravityX as number) ?? 0,
      y: (p.gravityY as number) ?? -1000,
      z: (p.gravityZ as number) ?? 0,
    };
  }
  if (p && typeof p.velocitySpread === 'number') {
    const s = Math.max(0, Math.min(1, p.velocitySpread as number));
    p.velocitySpread = { x: s, y: s, z: s };
  }
}

function validateParams(loaded: Params): void {
  if (!loaded.camera || typeof loaded.camera.distance !== 'number') {
    loaded.camera = { distance: 10000, type: 'perspective' };
  } else {
    loaded.camera.distance = Math.max(100, Math.min(20000, loaded.camera.distance));
    if (loaded.camera.type !== 'orthographic' && loaded.camera.type !== 'perspective') {
      loaded.camera.type = 'perspective';
    }
  }
  if (
    !loaded.workspace ||
    !loaded.workspace.backgroundColor ||
    typeof loaded.workspace.backgroundColor.r !== 'number' ||
    typeof loaded.workspace.backgroundColor.g !== 'number' ||
    typeof loaded.workspace.backgroundColor.b !== 'number'
  ) {
    loaded.workspace = { backgroundColor: { r: 65 / 255, g: 105 / 255, b: 225 / 255 } };
  } else {
    const c = loaded.workspace.backgroundColor;
    c.r = Math.max(0, Math.min(1, c.r));
    c.g = Math.max(0, Math.min(1, c.g));
    c.b = Math.max(0, Math.min(1, c.b));
  }

  const raw = loaded as unknown as Record<string, unknown>;
  if (raw.lighing && typeof raw.lighing === 'object' && !loaded.lighting) {
    loaded.lighting = raw.lighing as Params['lighting'];
  }
  delete raw.lighing;

  const d = getDefaultParams();
  if (!loaded.lighting || typeof loaded.lighting !== 'object') {
    loaded.lighting = JSON.parse(JSON.stringify(d.lighting)) as Params['lighting'];
  }
  const lc = loaded.lighting.color;
  if (!lc || typeof lc.r !== 'number' || typeof lc.g !== 'number' || typeof lc.b !== 'number') {
    loaded.lighting.color = { r: 0.8, g: 0.8, b: 0.8 };
  } else {
    lc.r = Math.max(0, Math.min(1, lc.r));
    lc.g = Math.max(0, Math.min(1, lc.g));
    lc.b = Math.max(0, Math.min(1, lc.b));
  }

  if (!loaded.emitter || typeof loaded.emitter !== 'object') {
    loaded.emitter = JSON.parse(JSON.stringify(d.emitter)) as Params['emitter'];
  }
  const e = loaded.emitter;
  if (e.orientation !== 'billboard' && e.orientation !== 'free') {
    e.orientation = 'billboard';
  }
  if (typeof e.useLighting !== 'boolean') e.useLighting = true;
  if (typeof e.useAlphaBlending !== 'boolean') e.useAlphaBlending = true;
  if (e.texture !== 'none' && e.texture !== 'atlas' && e.texture !== 'custom') e.texture = 'atlas';
  if (!e.atlasLayout || typeof e.atlasLayout.columns !== 'number' || typeof e.atlasLayout.rows !== 'number') {
    e.atlasLayout = { columns: 1, rows: 1 };
  } else {
    e.atlasLayout.columns = Math.max(1, Math.min(32, Math.floor(e.atlasLayout.columns)));
    e.atlasLayout.rows = Math.max(1, Math.min(32, Math.floor(e.atlasLayout.rows)));
  }

  if (!loaded.particle || typeof loaded.particle !== 'object') {
    loaded.particle = JSON.parse(JSON.stringify(d.particle)) as Params['particle'];
  }
  const p = loaded.particle;
  if (!p.physics || typeof p.physics !== 'object') {
    p.physics = JSON.parse(JSON.stringify(d.particle.physics)) as Params['particle']['physics'];
  }
  if (!p.atlas || typeof p.atlas !== 'object') {
    p.atlas = JSON.parse(JSON.stringify(d.particle.atlas)) as Params['particle']['atlas'];
  }
  if (p.atlas.sweepBy !== 'row' && p.atlas.sweepBy !== 'column') {
    p.atlas.sweepBy = 'row';
  }
  p.atlas.column = Math.max(0, Math.min(e.atlasLayout.columns - 1, Math.floor(p.atlas.column)));
  p.atlas.row = Math.max(0, Math.min(e.atlasLayout.rows - 1, Math.floor(p.atlas.row)));
  if (typeof p.useDiffuseAsAmbient !== 'boolean') {
    p.useDiffuseAsAmbient = true;
  }
  if (typeof p.randomStartRotation !== 'boolean') {
    p.randomStartRotation = false;
  }
  const vs = p.velocitySpread;
  if (!vs || typeof vs !== 'object' || typeof vs.x !== 'number' || typeof vs.y !== 'number' || typeof vs.z !== 'number') {
    p.velocitySpread = { x: 1, y: 1, z: 1 };
  } else {
    p.velocitySpread = {
      x: Math.max(0, Math.min(1, vs.x)),
      y: Math.max(0, Math.min(1, vs.y)),
      z: Math.max(0, Math.min(1, vs.z)),
    };
  }
  p.Ns = nearestPowerOfTwo(p.Ns);
}

/**
 * Same path as reading localStorage: migrations, emitter shape fixes, merge into defaults, validate.
 * Mutates `record` (migration steps). Strips {@link PARTICULAR_DEMO_PROJECT_VERSION_KEY} if present.
 */
export function paramsFromStoredRecord(record: Record<string, unknown>): Params {
  delete record[PARTICULAR_DEMO_PROJECT_VERSION_KEY];
  migrateLegacy(record);
  normalizeEmitterStorageShape(record);
  redistributeStoredParams(record);
  const loaded = getDefaultParams() as unknown as Record<string, unknown>;
  deepMerge(loaded, record);
  validateParams(loaded as Params);
  return loaded as Params;
}

/** Parse project/params JSON text; throws with a short message if invalid. */
export function parseProjectParamsJson(text: string): Params {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON: the file is not valid JSON.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid project file: the root value must be a JSON object.');
  }
  return paramsFromStoredRecord(parsed as Record<string, unknown>);
}

/** Plain snapshot of params plus optional export metadata (for download). */
export function buildProjectParamsExportObject(params: Params): Record<string, unknown> {
  return {
    [PARTICULAR_DEMO_PROJECT_VERSION_KEY]: PARTICULAR_DEMO_PROJECT_VERSION,
    ...(JSON.parse(JSON.stringify(params)) as Record<string, unknown>),
  };
}

/**
 * Copy validated values into the live proxied `params` without replacing nested object references
 * (Tweakpane bindings keep working).
 */
export function assignValidatedParamsIntoLiveParams(target: Params, validated: Params): void {
  Object.assign(target.camera, validated.camera);
  Object.assign(target.workspace.backgroundColor, validated.workspace.backgroundColor);
  Object.assign(target.lighting.color, validated.lighting.color);
  const te = target.emitter;
  const ve = validated.emitter;
  te.orientation = ve.orientation;
  te.useLighting = ve.useLighting;
  te.useAlphaBlending = ve.useAlphaBlending;
  te.texture = ve.texture;
  Object.assign(te.atlasLayout, ve.atlasLayout);
  assignParticleBranchInto(target.particle, validated.particle);
}

function assignParticleBranchInto(target: Params['particle'], source: Params['particle']): void {
  for (const key of Object.keys(source) as (keyof Params['particle'])[]) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      Object.getPrototypeOf(sv) === Object.prototype &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv) &&
      Object.getPrototypeOf(tv) === Object.prototype
    ) {
      Object.assign(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      (target as Record<string, unknown>)[key as string] = sv;
    }
  }
}

function loadParamsFromStorage(): Params {
  const fallback = getDefaultParams();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return paramsFromStoredRecord(parsed);
  } catch {
    return fallback;
  }
}

export function resetParamsToDefaults(params: Params): void {
  const d = getDefaultParams();
  params.camera = { ...d.camera };
  params.workspace = { backgroundColor: { ...d.workspace.backgroundColor } };
  params.lighting = { color: { ...d.lighting.color } };
  const pe = params.emitter;
  const de = d.emitter;
  pe.orientation = de.orientation;
  pe.useLighting = de.useLighting;
  pe.useAlphaBlending = de.useAlphaBlending;
  pe.texture = de.texture;
  pe.atlasLayout = { ...de.atlasLayout };
  Object.assign(params.particle, JSON.parse(JSON.stringify(d.particle)) as Params['particle']);
}

export function createPersistentParams(): Params {
  const loaded = loadParamsFromStorage();
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));

  function deepProxy<T extends object>(target: T): T {
    return new Proxy(target, {
      set(t, key, value) {
        (t as Record<string, unknown>)[key as string] = value;
        save();
        return true;
      },
      get(t, key) {
        const v = (t as Record<string, unknown>)[key as string];
        if (v != null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype) {
          return deepProxy(v as object);
        }
        return v;
      },
    }) as T;
  }
  return deepProxy(loaded);
}
