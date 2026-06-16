import {
  index,
  layout,
  prefix,
  type RouteConfig,
  route,
} from '@react-router/dev/routes';

export default [
  layout('layouts/root/layout.tsx', [
    // "/" – choose a profile
    index('routes/home/home.tsx'),
    ...prefix(':profile', [
      layout('layouts/profile/layout.tsx', [
        // "/:profile" – that profile's docs index
        index('routes/profile/profile.tsx'),
        // "/:profile/*" – a single MDX docs page
        route('*', 'routes/profile/page.tsx', { id: 'profile-page' }),
      ]),
    ]),
    route('*', 'routes/not-found.tsx', { id: 'not-found' }),
  ]),
] satisfies RouteConfig;
