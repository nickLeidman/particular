import { Particular } from '../../../src';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const engine = new Particular.Engine(canvas);

engine.setup((gl) => {
  console.log('WebGL is supported');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
});

const scene = new Particular.Scene(engine);

const emitter = new Particular.Emitter(engine);

scene.add(emitter);

engine.addScene(scene);

engine.start();
