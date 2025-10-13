import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl()],
  root: 'src',
  server: {
    open: true,
  },
  build: {
    outDir: '../../dist/demo/dev',
    emptyOutDir: true,
  },
  publicDir: 'public',
});
