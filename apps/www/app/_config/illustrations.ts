/**
 * Illustration libraries per profile, from the `@digdir/varde` package.
 *
 * Each profile's metadata and SVG strings are loaded on demand so the docs
 * bundle does not grow with every illustration added. Add a loader here when a
 * new profile folder is created under `packages/varde/illustrations/`.
 *
 * Safe to import on both client and server.
 */
import type {
  IllustrationColor,
  IllustrationMeta,
} from '@digdir/varde/illustrations';

export type IllustrationLibrary = {
  profile: string;
  colors: IllustrationColor[];
  illustrations: IllustrationMeta[];
  /** SVG strings keyed by `IllustrationMeta.exportName`. */
  svgs: Record<string, string>;
};

type MetaModule = {
  profile: string;
  colors: IllustrationColor[];
  illustrations: IllustrationMeta[];
};

const combine = async (
  meta: Promise<MetaModule>,
  svg: Promise<object>,
): Promise<IllustrationLibrary> => {
  const [metaModule, svgModule] = await Promise.all([meta, svg]);
  return {
    profile: metaModule.profile,
    colors: metaModule.colors,
    illustrations: metaModule.illustrations,
    svgs: { ...svgModule } as Record<string, string>,
  };
};

const loaders: Record<string, () => Promise<IllustrationLibrary>> = {
  digdir: () =>
    combine(
      import('@digdir/varde/illustrations/digdir/meta'),
      import('@digdir/varde/illustrations/digdir/svg'),
    ),
  uutilsynet: () =>
    combine(
      import('@digdir/varde/illustrations/uutilsynet/meta'),
      import('@digdir/varde/illustrations/uutilsynet/svg'),
    ),
};

const cache = new Map<string, Promise<IllustrationLibrary>>();

export const hasIllustrationLibrary = (profile?: string): profile is string =>
  profile !== undefined && profile in loaders;

/**
 * Load (and memoise) a profile's illustration library. The promise is stable
 * per profile, so it can be passed straight to React's `use()`.
 */
export const getIllustrationLibrary = (
  profile: string,
): Promise<IllustrationLibrary> => {
  let promise = cache.get(profile);
  if (!promise) {
    promise = loaders[profile]();
    cache.set(profile, promise);
  }
  return promise;
};

/**
 * Resolve the `var(--…, fallback)` colours in an SVG to plain hex values for
 * one colour scheme. `slotValues` maps a slot's CSS variable to the palette
 * colour name chosen for it; slots without a choice keep their drawn colour
 * (the nested fallback).
 */
export const applyColorScheme = (
  svg: string,
  colors: IllustrationColor[],
  scheme: 'light' | 'dark',
  slotValues: Record<string, string> = {},
) => {
  const values = new Map(
    colors.map((color) => [color.variable, color[scheme]]),
  );
  for (const [variable, colorName] of Object.entries(slotValues)) {
    const color = colors.find((candidate) => candidate.name === colorName);
    if (color) values.set(variable, color[scheme]);
  }

  // Resolve innermost `var()` first (fallbacks may themselves be `var()`s).
  const innermost = /var\((--[\w-]+)(?:,\s*([^()]*))?\)/g;
  let result = svg;
  let previous: string;
  do {
    previous = result;
    result = result.replace(
      innermost,
      (match, variable: string, fallback?: string) =>
        values.get(variable) ?? fallback?.trim() ?? match,
    );
  } while (result !== previous);
  return result;
};
