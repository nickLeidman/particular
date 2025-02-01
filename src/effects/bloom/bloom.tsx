import type { Engine } from '../../engine/engine';

export class Bloom {
  private gl: WebGL2RenderingContext;

  constructor(private engine: Engine) {
    this.gl = engine.gl;
  }
}
