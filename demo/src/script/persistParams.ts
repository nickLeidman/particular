import type { EmitterOrientation } from '@nleidman/particular';

const STORAGE_KEY = 'particular-demo-params';

export type TextureChoice = 'none' | 'atlas';

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

const defaultParams = {
  orientation: 'free' as EmitterOrientation,
  useLighting: true,
  lightColor: { r: 0.8, g: 0.8, b: 0.8 },
  useAlphaBlending: false,
  texture: 'none' as TextureChoice,
  camera: {
    distance: 10000,
    type: 'perspective' as 'orthographic' | 'perspective',
  },
  particle: {
    lifeTime: 800,
    count: 100,
    size: 10,
    scale: { x: 2, y: 1, z: 1 },
    v0: { x: 7000, y: 7000, z: 7000 },
    velocityBias: { x: 0, y: 0.8, z: 0 },
    omega0: 7,
    gravity: { x: 0, y: -500, z: 0 },
    spawnDuration: 200,
    spawnSize: 60,
    scaleWithAge: 1,
    useDiffuseAsAmbient: true,
    Ka: { r: 0.75, g: 0.68, b: 0.098 },
    Kd: { r: 0.75, g: 0.68, b: 0.098 },
    Ks: { r: 1, g: 1, b: 1 },
    Ns: 8,
  },
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

/** One-time migration of old localStorage shapes into current shape. */
function migrateLegacy(parsed: Record<string, unknown>): void {
  if ((parsed.mode === '2d' || parsed.mode === '3d') && parsed.orientation === undefined) {
    parsed.orientation = parsed.mode === '2d' ? 'billboard' : 'free';
  }
  const p = parsed.particle as Record<string, unknown> | undefined;
  if (p && ('gravityX' in p || 'gravityY' in p || 'gravityZ' in p) && !p.gravity) {
    p.gravity = {
      x: (p.gravityX as number) ?? 0,
      y: (p.gravityY as number) ?? -1000,
      z: (p.gravityZ as number) ?? 0,
    };
  }
}

function validateParams(loaded: Params): void {
  if (loaded.orientation !== 'billboard' && loaded.orientation !== 'free') {
    loaded.orientation = 'billboard';
  }
  if (!loaded.camera || typeof loaded.camera.distance !== 'number') {
    loaded.camera = { distance: 10000, type: 'perspective' };
  } else {
    loaded.camera.distance = Math.max(100, Math.min(20000, loaded.camera.distance));
    if (loaded.camera.type !== 'orthographic' && loaded.camera.type !== 'perspective') {
      loaded.camera.type = 'perspective';
    }
  }
  if (typeof loaded.useLighting !== 'boolean') loaded.useLighting = true;
  if (
    !loaded.lightColor ||
    typeof loaded.lightColor.r !== 'number' ||
    typeof loaded.lightColor.g !== 'number' ||
    typeof loaded.lightColor.b !== 'number'
  ) {
    loaded.lightColor = { r: 0.8, g: 0.8, b: 0.8 };
  }
  if (typeof loaded.useAlphaBlending !== 'boolean') loaded.useAlphaBlending = true;
  if (loaded.texture !== 'none' && loaded.texture !== 'atlas') loaded.texture = 'atlas';
  if (loaded.atlas.sweepBy !== 'row' && loaded.atlas.sweepBy !== 'column') {
    loaded.atlas.sweepBy = 'row';
  }
  if (typeof loaded.particle.useDiffuseAsAmbient !== 'boolean') {
    loaded.particle.useDiffuseAsAmbient = true;
  }
  loaded.particle.Ns = nearestPowerOfTwo(loaded.particle.Ns);
}

function loadParamsFromStorage(): Params {
  const loaded = getDefaultParams() as unknown as Record<string, unknown>;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return loaded as Params;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    migrateLegacy(parsed);
    deepMerge(loaded, parsed);
    validateParams(loaded as Params);
    return loaded as Params;
  } catch {
    return loaded as Params;
  }
}

export function resetParamsToDefaults(params: Params): void {
  const d = getDefaultParams();
  params.orientation = d.orientation;
  params.useLighting = d.useLighting;
  params.lightColor = { ...d.lightColor };
  params.useAlphaBlending = d.useAlphaBlending;
  params.texture = d.texture;
  params.camera = { ...d.camera };
  Object.assign(params.particle, d.particle);
  Object.assign(params.physics, d.physics);
  Object.assign(params.atlas, d.atlas);
  if (params.atlas.sweepBy !== 'row' && params.atlas.sweepBy !== 'column') {
    params.atlas.sweepBy = 'row';
  }
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
