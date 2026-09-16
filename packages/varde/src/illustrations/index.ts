/**
 * Shared types and runtime helpers for the illustration library. The build
 * script copies this file into `generated/illustrations/index.ts` and appends
 * the generated profile list and loaders, so it ships as
 * `@digdir/varde/illustrations`.
 */

/** Metadata for one illustration, from its `meta.json` and layer names. */
export type IllustrationMeta = {
  /** Folder name, kebab-case. Also the file name for downloads. */
  name: string;
  /** Named export in `@digdir/varde/illustrations/<profile>/react`. */
  componentName: string;
  /** Named export in `@digdir/varde/illustrations/<profile>/svg`. */
  exportName: string;
  title: string;
  description?: string;
  tags: string[];
  viewBox?: string;
  /** Recolourable parts, from layers named `Name [colour,…]`. */
  slots: IllustrationSlot[];
};

/** One colour from a profile palette (`colors.json`). */
export type IllustrationColor = {
  name: string;
  /** Human-readable name, e.g. "Rød". Falls back to `name`. */
  label: string;
  /** CSS custom property the illustrations reference, e.g. `--varde-illustration-digdir-figure`. */
  variable: string;
  light: string;
  dark: string;
};

/** A recolourable part of an illustration. */
export type IllustrationSlot = {
  /** kebab-case id, unique within the illustration. */
  name: string;
  /** Layer name as written by the designer, e.g. "Former". */
  label: string;
  /** Prop on the React component, e.g. `former`. */
  prop: string;
  /** CSS custom property to set to a palette colour, e.g. `var(--varde-illustration-digdir-brand1)`. */
  variable: string;
  /** Palette colour the part is drawn in. */
  default: string;
  /** Palette colours the part may be changed to. */
  colors: string[];
};

/** Shape of `@digdir/varde/illustrations/<profile>/meta`. */
export type IllustrationProfileMeta = {
  profile: string;
  colors: IllustrationColor[];
  illustrations: IllustrationMeta[];
};

/** A profile's metadata together with its SVG strings, keyed by `exportName`. */
export type IllustrationLibrary = IllustrationProfileMeta & {
  svgs: Record<string, string>;
};

export type ColorScheme = 'light' | 'dark';

/**
 * Merge slot colour choices into a `style` object as CSS variables. Used by
 * the generated React components; handy for other frameworks too.
 */
export const applySlots = <T extends object>(
  style: T | undefined,
  palettePrefix: string,
  slots: Record<string, string | undefined>,
): T | undefined => {
  const variables: Record<string, string> = {};
  for (const [variable, color] of Object.entries(slots)) {
    if (color) variables[variable] = `var(${palettePrefix}-${color})`;
  }
  if (Object.keys(variables).length === 0) return style;
  return { ...variables, ...style } as T;
};

/**
 * Resolve the `var(--…, fallback)` colours in an SVG string to plain hex
 * values for one colour scheme, e.g. for downloads or previews outside the
 * page's own scheme. `slotValues` maps a slot's CSS variable to the palette
 * colour chosen for it; slots without a choice keep their drawn colour.
 */
export const resolveColorScheme = (
  svg: string,
  colors: IllustrationColor[],
  scheme: ColorScheme,
  slotValues: Record<string, string> = {},
) => {
  const values = new Map(
    colors.map((color) => [color.variable, color[scheme]]),
  );
  for (const [variable, colorName] of Object.entries(slotValues)) {
    const color = colors.find((candidate) => candidate.name === colorName);
    if (color) values.set(variable, color[scheme]);
  }

  // Resolve innermost `var()` first – fallbacks may themselves be `var()`s.
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

/** Combine a profile's `meta` and `svg` modules into one library object. */
export const loadIllustrationLibrary = async (
  meta: Promise<IllustrationProfileMeta>,
  svg: Promise<object>,
): Promise<IllustrationLibrary> => {
  const [profileMeta, svgModule] = await Promise.all([meta, svg]);
  return { ...profileMeta, svgs: { ...svgModule } as Record<string, string> };
};
