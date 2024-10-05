/** @type {import('vite').UserConfig} */
import { defineConfig } from 'vite';
import { resolve } from 'path'
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tabcontent: resolve(__dirname, 'tabcontent.html'),
      },
    },
  },
});
