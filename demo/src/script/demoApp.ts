import {
  Emitter,
  type EmitterOrientation,
  Engine,
  type Geometry,
  ObjectLoader,
  type ParticleBatchOptions,
  Scene,
  Camera,
  Light,
  SimplexNoise,
  Vec3,
  TextureLoader,
} from '@nleidman/particular';
import particleImage from '../img/particle_atlas.png';
import type { FrameTimeGraphCallbacks } from './frameTimeGraph';
import type { Params } from './persistParams';

export type DemoApp = {
  engine: Engine;
  scene: Scene;
  emit: (config: ParticleBatchOptions) => void;
  updateBatches: (config: ParticleBatchOptions) => void;
  recreateEmitter: () => void;
  applyTextureChoice: () => void;
  setUseLighting: () => void;
  setLightColor: () => void;
  setUseAlphaBlending: () => void;
  applyCamera: () => void;
  /** Load a custom texture from a blob (e.g. user upload). Resolves when texture is ready. */
  setCustomTextureFromBlob: (blob: Blob) => Promise<void>;
  /** Clear the stored custom texture and stop using it. */
  clearCustomTexture: () => void;
  /** Load a custom OBJ from a blob and recreate emitter geometry. */
  setCustomObjectFromBlob: (blob: Blob) => Promise<void>;
  /** Clear uploaded custom OBJ and return to default plane geometry. */
  clearCustomObject: () => void;
  /** Toggle debug overlay that draws the simplex noise texture full-screen. */
  setNoisePreviewVisible: (visible: boolean) => void;
};

export function createDemoApp(container: HTMLDivElement, params: Params, frameTimeCallbacks: FrameTimeGraphCallbacks | null): DemoApp {
  const canvas = document.createElement('canvas');
  canvas.style.transform = `scale(${1 / window.devicePixelRatio})`;
  container.appendChild(canvas);

  const engine = new Engine(canvas, {
    size: { x: container.clientWidth, y: container.clientHeight },
    pixelRatio: window.devicePixelRatio,
    ...(frameTimeCallbacks && {
      onBeforeDraw: () => frameTimeCallbacks.onBeforeDraw(engine),
      onAfterDraw: () => frameTimeCallbacks.onAfterDraw(engine),
    }),
  });

  const loader = new ObjectLoader();

  const camera = new Camera(engine, params.camera.type, params.camera.distance);
  const light = new Light({
    position: camera.viewPosition,
    color: new Vec3(params.lightColor.r, params.lightColor.g, params.lightColor.b),
  });
  const scene = new Scene({
    camera,
    light,
  });
  engine.addScene(scene);

  let particleTexture: WebGLTexture | null = null;
  let customTexture: WebGLTexture | null = null;
  let customObjectGeometries: Geometry[] | null = null;

  function createEmitter(orientation: EmitterOrientation): Emitter {
    return new Emitter(engine, {
      orientation,
      atlasLayout: { columns: params.atlasLayout.columns, rows: params.atlasLayout.rows },
      useLighting: params.useLighting,
      useAlphaBlending: params.useAlphaBlending,
      modelGeometries: customObjectGeometries ?? undefined,
    });
  }

  let currentEmitter = createEmitter(params.orientation);
  scene.add(currentEmitter);

  function applyTextureChoice() {
    if (params.texture === 'atlas' && particleTexture) {
      currentEmitter.setTexture(particleTexture);
    } else if (params.texture === 'custom' && customTexture) {
      currentEmitter.setTexture(customTexture);
    } else {
      currentEmitter.setTexture(null);
    }
  }

  function recreateEmitter() {
    const batches = currentEmitter.takeBatches();
    scene.remove(currentEmitter);
    currentEmitter = createEmitter(params.orientation);
    currentEmitter.receiveBatches(batches);
    scene.add(currentEmitter);
    applyTextureChoice();
  }

  const textureLoader = new TextureLoader(engine);
  textureLoader.load(particleImage).then((texture: WebGLTexture) => {
    particleTexture = texture;
    applyTextureChoice();
  });

  function setCustomTextureFromBlob(blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    return textureLoader.load(url, { generateMipmaps: true, anisotropy: 8 }).then((texture: WebGLTexture) => {
      URL.revokeObjectURL(url);
      if (customTexture) engine.gl.deleteTexture(customTexture);
      customTexture = texture;
      applyTextureChoice();
    });
  }

  function clearCustomTexture(): void {
    if (customTexture) {
      engine.gl.deleteTexture(customTexture);
      customTexture = null;
    }
    applyTextureChoice();
  }

  function setCustomObjectFromBlob(blob: Blob): Promise<void> {
    return blob.text().then((objText) => {
      const parsed = loader.parseOBJ(objText);
      if (parsed.geometries.length === 0) {
        throw new Error('Uploaded OBJ has no geometry.');
      }
      customObjectGeometries = parsed.geometries;
      recreateEmitter();
    });
  }

  function clearCustomObject(): void {
    customObjectGeometries = null;
    recreateEmitter();
  }

  applyTextureChoice();

  const simplexNoise = new SimplexNoise(engine, {
    width: 256,
    height: 256,
    scale: 0.04,
    period: 2,
  });
  simplexNoise.render();
  const noiseOverlayCallback = () => simplexNoise.draw();
  function setNoisePreviewVisible(visible: boolean) {
    if (visible) {
      engine.attachOverlay(noiseOverlayCallback);
    } else {
      engine.removeOverlay(noiseOverlayCallback);
      engine.draw();
    }
  }

  function applyCamera() {
    scene.camera.setDistance(params.camera.distance);
    scene.camera.setType(params.camera.type);
  }

  return {
    engine,
    scene,
    emit: (config) => currentEmitter.emit(config),
    updateBatches: (config) => currentEmitter.updateBatches(config),
    recreateEmitter,
    applyTextureChoice,
    setUseLighting: () => currentEmitter.setUseLighting(params.useLighting),
    setLightColor: () => scene.light.setColor(params.lightColor.r, params.lightColor.g, params.lightColor.b),
    setUseAlphaBlending: () => currentEmitter.setUseAlphaBlending(params.useAlphaBlending),
    applyCamera,
    setCustomTextureFromBlob,
    clearCustomTexture,
    setCustomObjectFromBlob,
    clearCustomObject,
    setNoisePreviewVisible,
  };
}
