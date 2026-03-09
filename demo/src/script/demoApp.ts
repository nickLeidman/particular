import {
  Emitter,
  type EmitterOrientation,
  Engine,
  ObjectLoader,
  type ParticleBatchOptions,
  Scene,
  TextureLoader,
} from '@nleidman/particular';
import cube from '../Chair.obj?raw';
import particleImage from '../img/particle_atlas.png';
import type { FrameTimeGraphCallbacks } from './frameTimeGraph';
import type { Params } from './persistParams';

export type DemoApp = {
  engine: Engine;
  scene: Scene;
  emit: (config: ParticleBatchOptions) => void;
  recreateEmitter: () => void;
  applyTextureChoice: () => void;
  setUseLighting: () => void;
  setLightColor: () => void;
  setUseAlphaBlending: () => void;
};

export function createDemoApp(container: HTMLDivElement, params: Params, frameTimeCallbacks: FrameTimeGraphCallbacks | null): DemoApp {
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const engine = new Engine(canvas, {
    size: { x: container.clientWidth, y: container.clientHeight },
    pixelRation: 2,
    ...(frameTimeCallbacks && {
      onBeforeDraw: () => frameTimeCallbacks.onBeforeDraw(engine),
      onAfterDraw: () => frameTimeCallbacks.onAfterDraw(engine),
    }),
  });

  const loader = new ObjectLoader();
  loader.parseOBJ(cube); // keep for possible future body use

  const scene = new Scene(engine, { perspective: 10000 });
  scene.light.setColor(params.lightColor.r, params.lightColor.g, params.lightColor.b);

  let particleTexture: WebGLTexture | null = null;

  function createEmitter(orientation: EmitterOrientation): Emitter {
    return new Emitter(engine, {
      orientation,
      atlasLayout: { columns: 2, rows: 1 },
      useLighting: params.useLighting,
      useAlphaBlending: params.useAlphaBlending,
    });
  }

  let currentEmitter = createEmitter(params.orientation);
  scene.add(currentEmitter);

  function applyTextureChoice() {
    if (params.texture === 'atlas' && particleTexture) {
      currentEmitter.setTexture(particleTexture);
    } else {
      currentEmitter.setTexture(null);
    }
  }

  function recreateEmitter() {
    scene.remove(currentEmitter);
    currentEmitter = createEmitter(params.orientation);
    scene.add(currentEmitter);
    applyTextureChoice();
  }

  const textureLoader = new TextureLoader(engine);
  textureLoader.load(particleImage).then((texture: WebGLTexture) => {
    particleTexture = texture;
    applyTextureChoice();
  });

  applyTextureChoice();

  return {
    engine,
    scene,
    emit: (config) => currentEmitter.emit(config),
    recreateEmitter,
    applyTextureChoice,
    setUseLighting: () => currentEmitter.setUseLighting(params.useLighting),
    setLightColor: () => scene.light.setColor(params.lightColor.r, params.lightColor.g, params.lightColor.b),
    setUseAlphaBlending: () => currentEmitter.setUseAlphaBlending(params.useAlphaBlending),
  };
}
