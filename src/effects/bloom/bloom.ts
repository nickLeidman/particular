import quadVertexShader from '../../commonShaders/quadVertexShader.glsl';
import type { Engine } from '../../engine/engine';
import bloomBlurFragmentShader from './bloomBlurFragmentShader.glsl';
import bloomCompositeFragmentShader from './bloomCompositeFragmentShader.glsl';
import bloomDownsampleFragmentShader from './bloomDownsampleFragmentShader.glsl';
import bloomPrefilterFragmentShader from './bloomPrefilterFragmentShader.glsl';
import bloomUpsampleFragmentShader from './bloomUpsampleFragmentShader.glsl';

export type BloomQuality = 'low' | 'medium' | 'high';

export type BloomOptions = {
  enabled: boolean;
  threshold: number;
  knee: number;
  intensity: number;
  radius: number;
  quality: BloomQuality;
};

type BloomProgram = {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
};

type BloomLevel = {
  width: number;
  height: number;
  texture: WebGLTexture;
};

const DEFAULT_BLOOM_OPTIONS: BloomOptions = {
  enabled: false,
  threshold: 1.0,
  knee: 0.5,
  intensity: 1.0,
  radius: 1.0,
  quality: 'medium',
};

const QUALITY_MAX_LEVELS: Record<BloomQuality, number> = {
  low: 4,
  medium: 5,
  high: 6,
};

export class BloomEffect {
  private options: BloomOptions = { ...DEFAULT_BLOOM_OPTIONS };
  private readonly prefilterProgram: BloomProgram;
  private readonly downsampleProgram: BloomProgram;
  private readonly blurProgram: BloomProgram;
  private readonly upsampleProgram: BloomProgram;
  private readonly compositeProgram: BloomProgram;

  private readonly framebuffer: WebGLFramebuffer;
  private readonly levels: BloomLevel[] = [];
  private blurScratchTextures: WebGLTexture[] = [];
  private upsampleTextures: WebGLTexture[] = [];
  private allocatedWidth = 0;
  private allocatedHeight = 0;
  private allocatedQuality: BloomQuality = 'medium';

  constructor(private readonly engine: Engine) {
    const gl = this.engine.gl;
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create bloom framebuffer');
    }
    this.framebuffer = framebuffer;

    this.prefilterProgram = this.createProgramWithUniforms(bloomPrefilterFragmentShader, ['uTexture', 'uThreshold', 'uKnee']);
    this.downsampleProgram = this.createProgramWithUniforms(bloomDownsampleFragmentShader, ['uTexture']);
    this.blurProgram = this.createProgramWithUniforms(bloomBlurFragmentShader, ['uTexture', 'uDirection', 'uRadius']);
    this.upsampleProgram = this.createProgramWithUniforms(bloomUpsampleFragmentShader, ['uLowTexture', 'uHighTexture', 'uRadius']);
    this.compositeProgram = this.createProgramWithUniforms(bloomCompositeFragmentShader, ['uSceneTexture', 'uBloomTexture', 'uIntensity']);
  }

  setOptions(options: Partial<BloomOptions>): BloomOptions {
    this.options = {
      ...this.options,
      ...options,
      threshold: Math.max(0, options.threshold ?? this.options.threshold),
      knee: Math.max(0, options.knee ?? this.options.knee),
      intensity: Math.max(0, options.intensity ?? this.options.intensity),
      radius: Math.max(0, options.radius ?? this.options.radius),
      quality: options.quality ?? this.options.quality,
    };
    this.ensureTargets();
    return { ...this.options };
  }

  getOptions(): BloomOptions {
    return { ...this.options };
  }

  isEnabled(): boolean {
    return this.options.enabled;
  }

  onResize(): void {
    this.ensureTargets(true);
  }

  draw(sceneTexture: WebGLTexture): void {
    this.ensureTargets();
    if (!this.options.enabled || this.levels.length === 0) {
      this.compositeWithoutBloom(sceneTexture);
      return;
    }

    this.prefilter(sceneTexture, this.levels[0]);
    this.blurLevel(0);
    for (let i = 1; i < this.levels.length; i++) {
      this.downsample(this.levels[i - 1].texture, this.levels[i]);
      this.blurLevel(i);
    }

    const lastIndex = this.levels.length - 1;
    this.copyTexture(this.levels[lastIndex].texture, this.upsampleTextures[lastIndex], this.levels[lastIndex].width, this.levels[lastIndex].height);
    for (let i = lastIndex - 1; i >= 0; i--) {
      this.upsample(this.upsampleTextures[i + 1], this.levels[i].texture, this.upsampleTextures[i], this.levels[i].width, this.levels[i].height);
    }

    this.engine.resetViewport();
    this.engine.resetRenderTarget();
    const gl = this.engine.gl;
    gl.useProgram(this.compositeProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(this.compositeProgram.uniforms.uSceneTexture, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.upsampleTextures[0]);
    gl.uniform1i(this.compositeProgram.uniforms.uBloomTexture, 1);
    gl.uniform1f(this.compositeProgram.uniforms.uIntensity, this.options.intensity);
    this.engine.drawQuad();
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private compositeWithoutBloom(sceneTexture: WebGLTexture): void {
    this.engine.resetViewport();
    this.engine.resetRenderTarget();
    const gl = this.engine.gl;
    gl.useProgram(this.compositeProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(this.compositeProgram.uniforms.uSceneTexture, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(this.compositeProgram.uniforms.uBloomTexture, 1);
    gl.uniform1f(this.compositeProgram.uniforms.uIntensity, 0);
    this.engine.drawQuad();
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private prefilter(sourceTexture: WebGLTexture, target: BloomLevel): void {
    const gl = this.engine.gl;
    this.engine.attachRenderTarget(target.texture, this.framebuffer);
    this.engine.setViewport(0, 0, target.width, target.height);
    gl.useProgram(this.prefilterProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.prefilterProgram.uniforms.uTexture, 0);
    gl.uniform1f(this.prefilterProgram.uniforms.uThreshold, this.options.threshold);
    gl.uniform1f(this.prefilterProgram.uniforms.uKnee, this.options.knee);
    this.engine.drawQuad();
  }

  private downsample(sourceTexture: WebGLTexture, target: BloomLevel): void {
    const gl = this.engine.gl;
    this.engine.attachRenderTarget(target.texture, this.framebuffer);
    this.engine.setViewport(0, 0, target.width, target.height);
    gl.useProgram(this.downsampleProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.downsampleProgram.uniforms.uTexture, 0);
    this.engine.drawQuad();
  }

  private upsample(lowTexture: WebGLTexture, highTexture: WebGLTexture, outTexture: WebGLTexture, width: number, height: number): void {
    const gl = this.engine.gl;
    this.engine.attachRenderTarget(outTexture, this.framebuffer);
    this.engine.setViewport(0, 0, width, height);
    gl.useProgram(this.upsampleProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lowTexture);
    gl.uniform1i(this.upsampleProgram.uniforms.uLowTexture, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, highTexture);
    gl.uniform1i(this.upsampleProgram.uniforms.uHighTexture, 1);
    gl.uniform1f(this.upsampleProgram.uniforms.uRadius, this.options.radius);
    this.engine.drawQuad();
  }

  private copyTexture(sourceTexture: WebGLTexture, outTexture: WebGLTexture, width: number, height: number): void {
    const gl = this.engine.gl;
    this.engine.attachRenderTarget(outTexture, this.framebuffer);
    this.engine.setViewport(0, 0, width, height);
    gl.useProgram(this.downsampleProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.downsampleProgram.uniforms.uTexture, 0);
    this.engine.drawQuad();
  }

  private blurLevel(levelIndex: number): void {
    const level = this.levels[levelIndex];
    const scratchTexture = this.blurScratchTextures[levelIndex];
    const radius = this.options.radius * (1 + levelIndex * 0.35);
    this.blurPass(level.texture, scratchTexture, level.width, level.height, radius, 1, 0);
    this.blurPass(scratchTexture, level.texture, level.width, level.height, radius, 0, 1);
  }

  private blurPass(
    sourceTexture: WebGLTexture,
    targetTexture: WebGLTexture,
    width: number,
    height: number,
    radius: number,
    directionX: number,
    directionY: number,
  ): void {
    const gl = this.engine.gl;
    this.engine.attachRenderTarget(targetTexture, this.framebuffer);
    this.engine.setViewport(0, 0, width, height);
    gl.useProgram(this.blurProgram.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.blurProgram.uniforms.uTexture, 0);
    gl.uniform2f(this.blurProgram.uniforms.uDirection, directionX, directionY);
    gl.uniform1f(this.blurProgram.uniforms.uRadius, radius);
    this.engine.drawQuad();
  }

  private ensureTargets(force = false): void {
    const width = this.engine.resolution.x;
    const height = this.engine.resolution.y;
    const quality = this.options.quality;
    if (!force && width === this.allocatedWidth && height === this.allocatedHeight && quality === this.allocatedQuality) {
      return;
    }

    const gl = this.engine.gl;
    for (const level of this.levels) {
      gl.deleteTexture(level.texture);
    }
    for (const texture of this.upsampleTextures) {
      gl.deleteTexture(texture);
    }
    for (const texture of this.blurScratchTextures) {
      gl.deleteTexture(texture);
    }
    this.levels.length = 0;
    this.upsampleTextures = [];
    this.blurScratchTextures = [];

    const maxLevels = QUALITY_MAX_LEVELS[quality];
    let currentWidth = Math.max(1, Math.floor(width / 2));
    let currentHeight = Math.max(1, Math.floor(height / 2));
    for (let i = 0; i < maxLevels; i++) {
      const texture = this.createTexture(currentWidth, currentHeight);
      const blurScratchTexture = this.createTexture(currentWidth, currentHeight);
      const upsampleTexture = this.createTexture(currentWidth, currentHeight);
      this.levels.push({ width: currentWidth, height: currentHeight, texture });
      this.blurScratchTextures.push(blurScratchTexture);
      this.upsampleTextures.push(upsampleTexture);
      if (currentWidth === 1 && currentHeight === 1) {
        break;
      }
      currentWidth = Math.max(1, Math.floor(currentWidth / 2));
      currentHeight = Math.max(1, Math.floor(currentHeight / 2));
    }

    this.allocatedWidth = width;
    this.allocatedHeight = height;
    this.allocatedQuality = quality;
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const gl = this.engine.gl;
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to create bloom texture');
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R11F_G11F_B10F, width, height, 0, gl.RGB, gl.UNSIGNED_INT_10F_11F_11F_REV, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  private createProgramWithUniforms(fragmentShaderSource: string, uniforms: string[]): BloomProgram {
    const program = this.engine.createProgramFromShaders(quadVertexShader, fragmentShaderSource);
    const locations: Record<string, WebGLUniformLocation | null> = {};
    for (const uniform of uniforms) {
      locations[uniform] = this.engine.gl.getUniformLocation(program, uniform);
    }
    return { program, uniforms: locations };
  }
}
