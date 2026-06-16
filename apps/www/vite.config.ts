import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const appDir = fileURLToPath(new URL('./app', import.meta.url));

// MDX is bundled at request time with mdx-bundler (not imported as modules),
// so Vite doesn't know about `.mdx` changes – trigger a full reload manually.
function mdxFullReload() {
  return {
    name: 'mdx-full-reload',
    // biome-ignore lint/suspicious/noExplicitAny: no types for the dev server here
    handleHotUpdate({ file, server }: { file: string; server: any }) {
      if (file.endsWith('.mdx')) {
        server.ws.send({ type: 'full-reload', path: '*' });
      }
    },
  };
}

export default defineConfig({
  plugins: [reactRouter(), mdxFullReload()],
  resolve: {
    alias: [{ find: /^~\//, replacement: `${appDir}/` }],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router'],
  },
});
