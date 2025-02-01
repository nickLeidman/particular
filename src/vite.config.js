import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  plugins: [glsl(), dts()],
  root: 'src',
  build: {
    lib: {
      entry: 'index.ts',
      name: 'particular',
      fileName: 'index',
      formats: ['es'],
    },
    target: 'modules',
    outDir: '../dist/lib',
    emptyOutDir: true,
  },
});
