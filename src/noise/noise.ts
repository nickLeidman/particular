import type { Engine } from '../engine/engine';

export class Noise {
  public textureBuffer: WebGLTexture;

  constructor(private readonly engine: Engine) {}
}
