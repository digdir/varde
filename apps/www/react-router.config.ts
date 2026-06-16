import type { Config } from '@react-router/dev/config';
import { generatePrerenderPaths } from './app/_utils/config/generate-prerender-paths';

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Statically pre-render the profile chooser and every MDX page at build time.
  // (Ignored by `react-router dev`, which always renders on demand.)
  prerender: () => generatePrerenderPaths(),
  future: {
    v8_middleware: true,
    v8_passThroughRequests: true,
    v8_splitRouteModules: true,
    v8_trailingSlashAwareDataRequests: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
