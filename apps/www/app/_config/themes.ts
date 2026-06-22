/**
 * Maps each Designsystemet theme (see `_config/profiles`) to the built CSS
 * asset shipped in `design-tokens-build/<theme>.css`. The URLs are resolved by
 * Vite (`?url`) so they get content-hashed and served as static assets, which
 * lets us load exactly one theme at a time via a `<link>` instead of bundling
 * every theme's `:root` variables into the same document.
 */
import altinnTheme from '../../../../design-tokens-build/altinn.css?url';
import digdirTheme from '../../../../design-tokens-build/digdir.css?url';
import portalTheme from '../../../../design-tokens-build/portal.css?url';
import uutilsynetTheme from '../../../../design-tokens-build/uutilsynet.css?url';

/** Theme used when a profile maps to a theme without a built stylesheet. */
export const DEFAULT_THEME = 'digdir';

const themeStylesheets: Record<string, string> = {
  altinn: altinnTheme,
  digdir: digdirTheme,
  portal: portalTheme,
  uutilsynet: uutilsynetTheme,
};

/** Resolve a theme name to its stylesheet URL, falling back to the default. */
export const getThemeStylesheet = (theme?: string): string =>
  themeStylesheets[theme ?? ''] ?? themeStylesheets[DEFAULT_THEME];
