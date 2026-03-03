const STORAGE_KEY = 'particular-demo-params';

const defaultParams = {
  particle: {
    lifeTime: 4000,
    count: 100,
    size: 100,
    aspectRatio: 1,
    v0: { x: 4000, y: 4000, z: 4000 },
    omega0: 5,
    gravityX: 0,
    gravityY: -1000,
    gravityZ: 0,
    spawnDuration: 200,
    spawnSize: 40,
    scaleWithAge: 1,
  },
  physics: {
    Cd: 1.1,
    Cr: 1.5,
    ro: 0.2,
    area: 400,
    mass: 0.00001,
    momentOfInertia: 0.00002,
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

export function resetParamsToDefaults(params: Params): void {
  const d = getDefaultParams();
  Object.assign(params.particle, d.particle);
  Object.assign(params.particle.v0, d.particle.v0);
  Object.assign(params.physics, d.physics);
  Object.assign(params.atlas, d.atlas);
}

function loadParamsFromStorage(): Params {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultParams));
    const parsed = JSON.parse(raw) as Partial<Params>;
    const loaded: Params = JSON.parse(JSON.stringify(defaultParams));
    if (parsed.particle) {
      Object.assign(loaded.particle, parsed.particle);
      if (parsed.particle.v0) Object.assign(loaded.particle.v0, parsed.particle.v0);
      // Support legacy stored shape with gravity: { x, y, z }
      const g = (parsed.particle as { gravity?: { x?: number; y?: number; z?: number } }).gravity;
      if (g) {
        if (g.x !== undefined) loaded.particle.gravityX = g.x;
        if (g.y !== undefined) loaded.particle.gravityY = g.y;
        if (g.z !== undefined) loaded.particle.gravityZ = g.z;
      }
    }
    if (parsed.physics) Object.assign(loaded.physics, parsed.physics);
    if (parsed.atlas) {
      Object.assign(loaded.atlas, parsed.atlas);
      if (loaded.atlas.sweepBy !== 'row' && loaded.atlas.sweepBy !== 'column') {
        loaded.atlas.sweepBy = 'row';
      }
    }
    return loaded;
  } catch {
    return JSON.parse(JSON.stringify(defaultParams));
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
