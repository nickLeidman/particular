import type { ParticleBatchOptions } from '@nleidman/particular';
import type { BindingApi } from '@tweakpane/core';
import { Pane } from 'tweakpane';
import type { Params } from '../../script/persistParams';
import { Ns_POW2 } from '../../script/persistParams';
import type { TweakpaneUiContext } from '..';

type ChangeableBindingApi = BindingApi & {
  on: (ev: string, fn: () => void) => void;
  dispose?: () => void;
};

export type ParticlePaneResult = {
  pane: Pane;
  bindings: BindingApi[];
  setKaDisabled: (disabled: boolean) => void;
};

export const createParticlePane = (
  params: Params,
  _context: TweakpaneUiContext,
  options: { compileConfig: (p: Params, x: number, y: number) => ParticleBatchOptions },
): ParticlePaneResult => {
  const particlePane = new Pane({ title: 'Particle' });
  const bindings: BindingApi[] = [];

  bindings.push(
    particlePane.addBinding(params.particle, 'lifeTime', {
      min: 100,
      step: 100,
      label: 'lifetime (ms)',
    }),
  );

  bindings.push(
    particlePane.addBinding(params.particle, 'count', {
      min: 1,
      step: 1,
      label: 'count',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'size', {
      min: 1,
      max: 500,
      step: 1,
      label: 'size (px)',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'scale', {
      label: 'scale',
      x: { min: 0.1, max: 10, step: 0.1 },
      y: { min: 0.1, max: 10, step: 0.1 },
      z: { min: 0.1, max: 10, step: 0.1 },
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'v0', {
      label: 'velocity (px/s)',
      x: { min: 0, step: 100 },
      y: { min: 0, step: 100 },
      z: { min: 0, step: 100 },
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'velocityBias', {
      label: 'velocity bias',
      x: { min: -2, max: 2, step: 0.1 },
      y: { min: -2, max: 2, step: 0.1 },
      z: { min: -2, max: 2, step: 0.1 },
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'velocitySpread', {
      label: 'velocity spread',
      x: { min: 0, max: 2, step: 0.05 },
      y: { min: 0, max: 2, step: 0.05 },
      z: { min: 0, max: 2, step: 0.05 },
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'omega0', {
      min: 0,
      step: 0.5,
      label: 'angular velocity (rad/s)',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'randomStartRotation', {
      label: 'random start rotation',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'gravity', {
      label: 'gravity',
      x: { step: 100 },
      y: { step: 100 },
      z: { step: 100 },
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'spawnDuration', {
      min: 0,
      step: 10,
      label: 'spawn duration (ms)',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'spawnSize', {
      min: 0,
      step: 1,
      label: 'spawn size (px)',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'scaleWithAge', {
      min: -5,
      max: 5,
      step: 0.1,
      label: 'shrink with age',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'swayStrength', {
      min: 0,
      step: 1,
      label: 'sway strength (px)',
    }),
  );
  bindings.push(
    particlePane.addBinding(params.particle, 'swayTimeScale', {
      step: 0.01,
      label: 'sway time scale',
    }),
  );

  /* ================= MATERIAL ================= */

  const materialFolder = particlePane.addFolder({
    title: 'Material',
    expanded: true,
  });
  const useDiffuseAsAmbientBinding = materialFolder.addBinding(params.particle, 'useDiffuseAsAmbient', {
    label: 'Use diffuse as ambient',
  }) as ChangeableBindingApi;
  bindings.push(useDiffuseAsAmbientBinding);
  const kaBinding = materialFolder.addBinding(params.particle, 'Ka', {
    color: { type: 'float' },
    label: 'Ambient (Ka)',
  });
  bindings.push(kaBinding);
  const setKaDisabled = (v: boolean) => {
    (kaBinding as unknown as { disabled: boolean }).disabled = v;
  };
  setKaDisabled(params.particle.useDiffuseAsAmbient);
  useDiffuseAsAmbientBinding.on('change', () => setKaDisabled(params.particle.useDiffuseAsAmbient));
  bindings.push(
    materialFolder.addBinding(params.particle, 'Kd', {
      color: { type: 'float' },
      label: 'Diffuse (Kd)',
    }),
  );
  bindings.push(
    materialFolder.addBinding(params.particle, 'Ks', {
      color: { type: 'float' },
      label: 'Specular (Ks)',
    }),
  );
  const NsOptions: Record<string, number> = {};
  for (const n of Ns_POW2) NsOptions[String(n)] = n;
  bindings.push(
    materialFolder.addBinding(params.particle, 'Ns', {
      options: NsOptions,
      label: 'Shininess (Ns)',
    }),
  );

  /* ================= PHYSICS ================= */

  const physicsFolder = particlePane.addFolder({
    title: 'Physics',
    expanded: true,
  });
  bindings.push(
    physicsFolder.addBinding(params.particle.physics, 'Cd', {
      min: 0,
      max: 5,
      step: 0.1,
      label: 'drag coeff',
    }),
  );
  bindings.push(
    physicsFolder.addBinding(params.particle.physics, 'Cr', {
      min: 0,
      max: 5,
      step: 0.1,
      label: 'angular drag',
    }),
  );
  bindings.push(
    physicsFolder.addBinding(params.particle.physics, 'ro', {
      min: 0,
      max: 2,
      step: 0.01,
      label: 'fluid density',
    }),
  );
  bindings.push(
    physicsFolder.addBinding(params.particle.physics, 'area', {
      min: 0,
      max: 2000,
      step: 50,
      label: 'area (px²)',
    }),
  );
  bindings.push(
    physicsFolder.addBinding(params.particle.physics, 'mass', {
      min: 1e-7,
      max: 0.01,
      step: 1e-6,
      label: 'mass (kg)',
    }),
  );
  bindings.push(
    physicsFolder.addBinding(params.particle.physics, 'momentOfInertia', {
      min: 1e-7,
      max: 0.01,
      step: 1e-6,
      label: 'moment of inertia',
    }),
  );

  /* ================= ATLAS (per-batch frame / sweep) ================= */

  const atlasFolder = particlePane.addFolder({
    title: 'Atlas',
    expanded: false,
  });
  bindings.push(
    atlasFolder.addBinding(params.particle.atlas, 'column', {
      step: 1,
      label: 'offset column',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.particle.atlas, 'row', {
      step: 1,
      label: 'offset row',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.particle.atlas, 'sweepBy', {
      options: { row: 'row', column: 'column' },
      label: 'sweep by',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.particle.atlas, 'sweepStepTime', {
      min: 0,
      max: 200,
      step: 1,
      label: 'sweep step (ms)',
    }),
  );
  bindings.push(
    atlasFolder.addBinding(params.particle.atlas, 'sweepStepCount', {
      min: 1,
      max: 32,
      step: 1,
      label: 'sweep steps',
    }),
  );

  /* ================= COPY CONFIG ================= */

  particlePane.addBlade({ view: 'separator' });

  particlePane.addButton({ title: 'Copy Particle Config JSON' }).on('click', () => {
    const config = options.compileConfig(params, 0, 0);
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
  });

  return {
    pane: particlePane,
    bindings,
    setKaDisabled,
  };
};
