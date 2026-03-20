import type { Engine } from '../../engine/engine';

export class TextureLoader {
  constructor(private engine: Engine) {}
  load(src: string, options?: { generateMipmaps?: boolean; anisotropy?: number }): Promise<WebGLTexture> {
    const gl = this.engine.gl;
    const generateMipmaps = options?.generateMipmaps !== false;
    const requestedAnisotropy = options?.anisotropy ?? 1;
    return fetch(src, { mode: 'cors' })
      .then((res) => res.blob())
      .then((blob) => createImageBitmap(blob, { premultiplyAlpha: 'premultiply', colorSpaceConversion: 'none' }))
      .then((bitmap) => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        // Prevent sampling from opposite texture edge at UV island borders.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (generateMipmaps) {
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (requestedAnisotropy > 1) {
          const ext =
            gl.getExtension('EXT_texture_filter_anisotropic') ||
            gl.getExtension('MOZ_EXT_texture_filter_anisotropic') ||
            gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
          if (ext) {
            const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(requestedAnisotropy, maxAnisotropy));
          }
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
      });
  }
}
