import type { ParticleBatchOptions } from '@nleidman/particular';
import type { Params } from './persistParams';

/**
 * Maps current params and click position to a ParticleBatchOptions object for emitting a batch.
 */
export function compileConfig(params: Params, originX: number, originY: number): ParticleBatchOptions {
  const p = params.particle;
  const ph = params.physics;
  const a = params.atlas;
  return {
    lifeTime: p.lifeTime,
    count: p.count,
    size: p.size,
    scale: { ...p.scale },
    origin: { x: originX, y: originY },
    v0: { ...p.v0 },
    velocityBias: { ...p.velocityBias },
    omega0: p.omega0,
    gravity: { ...p.gravity },
    spawnDuration: p.spawnDuration,
    Cd: ph.Cd,
    Cr: ph.Cr,
    density: ph.ro / 1000 ** 3,
    area: ph.area,
    mass: ph.mass,
    momentOfInertia: ph.momentOfInertia,
    atlas: {
      offset: { column: a.column, row: a.row },
      sweep: { by: a.sweepBy, stepTime: a.sweepStepTime, stepCount: a.sweepStepCount },
    },
    spawnSize: p.spawnSize,
    scaleWithAge: p.scaleWithAge,
    Ka: p.useDiffuseAsAmbient ? { r: p.Kd.r, g: p.Kd.g, b: p.Kd.b } : { r: p.Ka.r, g: p.Ka.g, b: p.Ka.b },
    Kd: { r: p.Kd.r, g: p.Kd.g, b: p.Kd.b },
    Ks: { r: p.Ks.r, g: p.Ks.g, b: p.Ks.b },
    Ns: p.Ns,
  };
}
