export interface EmitterOptions {
  texture?: WebGLTexture;
  atlasLayout?: {
    columns: number;
    rows: number;
  };
  is2d: boolean;
}

export interface ParticleBatchOptions {
  /** Lifetime of a particle batch in **ms**, batch will be disposed of after `lifeTime` + `spawnDuration` */
  lifeTime: number;
  /** Number of particles in the batch */
  count: number;
  /** Size of a particle in **pixels** */
  size: number;
  /**
   * Aspect ratio of the particle.
   * @default 1
   */
  aspectRatio?: number;
  /** Origin of the particle in **pixels**, relative to the top left corner*/
  origin: { x: number; y: number };
  /** Initial velocity of the particle in **pixels/s**. Each particle in a batch will receive a random velocity between `-v0` and `v0` */
  v0: { x: number; y: number; z: number };
  /**
   * Velocity bias of a particle in fractions of `v0` for each axis.
   * Used to skew velocity distribution.
   * For example, if v0 is 10 px/s and velocity bias is 0, particle velocity will be between -10 and 10 px/s.
   * If velocity bias is 0.5, particle velocity will be between -5 and 15 px/s.
   *
   * @default { x: 0, y: 0, z: 0 }
   */
  velocityBias?: { x: number; y: number; z: number };
  /**
   * Initial angular velocity of the particle in **radians/s**.
   * Each particle in a batch will receive a random velocity between `-omega0` and `omega0`.
   */
  omega0: number;
  /** Gravity of the particle batch in **pixels/s^2** */
  gravity: { x: number; y: number; z: number };
  /**
   * Period of time during which particles will spawn. In **ms**
   * @default 0
   */
  spawnDuration?: number;
  /** Drag coefficient of a particle. Used for fluid simulation */
  Cd: number;
  /** Angular drag coefficient of a particle. Used for fluid simulation */
  Cr: number;
  /** Density of a fluid the particle is moving through. In **kg/kpx^3**. Used for fluid simulation */
  density: number;
  /** Cross-sectional area of a particle. In **px^2**. Used for fluid simulation */
  area: number;
  /** Mass of a particle. In **kg**. Used for fluid simulation */
  mass: number;
  /** Moment of inertia of a particle. In **kg*px^2**. Used for fluid simulation */
  momentOfInertia: number;
  /**
   * Offset of the texture in the atlas
   * @default { offset: { column: 0, row: 0 } }
   */
  atlas: {
    offset: { column: number; row: number };
    sweep?: { by: 'column' | 'row'; stepTime: number; stepCount: number };
  };
  /**
   * Amount of scaling applied to a particle based on its age.
   * @default 0
   */
  scaleWithAge: number;
  /**
   * Diameter of a spawn area in **pixels**.
   * */
  spawnSize: number;
}

export interface ParticleBatchProcessed extends ParticleBatchOptions {
  aspectRatio: number;
  velocityBias: { x: number; y: number; z: number };
  spawnDuration: number;
  atlas: {
    offset: { column: number; row: number };
    sweep?: { by: 'column' | 'row'; stepTime: number; stepCount: number };
  };
  scaleWithAge: number;
  drag: number;
  angularDrag: number;
}
