import type { Engine } from '../engine/engine';

export class TextureLoader {
  constructor(private engine: Engine) {}
  load(src: string): Promise<WebGLTexture> {
    const gl = this.engine.gl;
    return fetch(src, { mode: 'cors' })
      .then((res) => res.blob())
      .then((blob) => createImageBitmap(blob, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' }))
      .then((bitmap) => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
      });
  }
}
