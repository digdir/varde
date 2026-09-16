/**
 * Generates the illustration library from `illustrations/<profile>/<name>/`.
 *
 * Each profile folder has a `colors.json` (the palette used by its
 * illustrations, with light and dark values) and one folder per illustration
 * containing exactly one `.svg` file and a `meta.json` (see `meta.schema.json`).
 *
 * For every profile this writes, under `generated/illustrations/<profile>/`:
 *   - `react/<Name>.tsx` + `react/index.ts`  React components
 *   - `svg.ts`                                framework-agnostic SVG strings
 *   - `meta.ts`                               titles, tags, colours, slots
 * and, under `dist/illustrations/`, a `<profile>.css` with the colour
 * variables plus an `index.css` combining every profile.
 *
 * Colours: hard-coded palette colours are replaced with
 * `var(--varde-illustration-<profile>-<colour>, <light hex>)`, so the SVGs
 * render correctly without the CSS and switch to the dark palette when the
 * CSS is loaded and `data-color-scheme="dark"` is set.
 *
 * Colour slots: a layer named `Former [brand1,brand2]` in Illustrator marks
 * the shape(s) as recolourable to the listed palette colours. The build reads
 * the marker from the exported `data-name` attribute (Illustrator flattens the
 * brackets in `id`), gives the slot its own variable that falls back to the
 * drawn colour, adds a typed prop to the React component and lists the slot
 * in `meta.ts`. Layers without a `[...]` list are never recoloured.
 *
 * Run with `node scripts/build-illustrations.ts` (Node ≥ 22.18 strips types),
 * then compile `generated/` with `tsc -p tsconfig.build.json`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from '@svgr/core';
import { type CustomPlugin, optimize, type XastElement } from 'svgo';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const sourceDir = path.join(packageRoot, 'illustrations');
const generatedDir = path.join(packageRoot, 'generated', 'illustrations');
const distDir = path.join(packageRoot, 'dist', 'illustrations');

const VARIABLE_PREFIX = '--varde-illustration';

type ColorDefinition = { label?: string; light: string; dark: string };
type Palette = Record<string, ColorDefinition>;

type Meta = {
  $schema?: string;
  title: string;
  description?: string;
  tags: string[];
};

type IllustrationColor = {
  name: string;
  label: string;
  variable: string;
  light: string;
  dark: string;
};

type IllustrationSlot = {
  name: string;
  label: string;
  prop: string;
  variable: string;
  default: string;
  colors: string[];
};

type Illustration = {
  name: string;
  componentName: string;
  exportName: string;
  title: string;
  description?: string;
  tags: string[];
  viewBox?: string;
  slots: IllustrationSlot[];
  svg: string;
};

const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const HEX_PATTERN = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi;
const COLOR_ATTRIBUTES = [
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
];
const SLOT_ATTRIBUTE = 'data-varde-slot';
/** Props already used by the generated component, so slots can't take them. */
const RESERVED_PROPS = new Set([
  'title',
  'titleId',
  'style',
  'ref',
  'key',
  'children',
]);

const toPascalCase = (slug: string) =>
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const toCamelCase = (slug: string) => {
  const pascal = toPascalCase(slug);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/** "Former og figurer" → "former-og-figurer" (æøå folded to ASCII). */
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as T;

const listDirectories = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

/** Expand `#abc` to `#aabbcc` and lower-case, so palette lookups are stable. */
const normalizeHex = (hex: string) => {
  const value = hex.toLowerCase();
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value;
};

const escapeTemplateLiteral = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const readPalette = (profile: string): IllustrationColor[] => {
  const file = path.join(sourceDir, profile, 'colors.json');
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${path.relative(packageRoot, file)}`);
  }

  const palette = readJson<Palette>(file);

  return Object.entries(palette).map(([name, definition]) => {
    if (!SLUG_PATTERN.test(name)) {
      throw new Error(
        `Colour "${name}" in ${profile}/colors.json must be kebab-case (a-z, 0-9, -).`,
      );
    }
    for (const mode of ['light', 'dark'] as const) {
      if (!/^#[0-9a-f]{6}$/i.test(definition?.[mode] ?? '')) {
        throw new Error(
          `Colour "${name}" in ${profile}/colors.json needs a 6-digit hex "${mode}" value.`,
        );
      }
    }
    return {
      name,
      label: definition.label ?? name,
      variable: `${VARIABLE_PREFIX}-${profile}-${name}`,
      light: normalizeHex(definition.light),
      dark: normalizeHex(definition.dark),
    };
  });
};

const readMeta = (dir: string): Meta => {
  const file = path.join(dir, 'meta.json');
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${path.relative(packageRoot, file)}`);
  }

  const meta = readJson<Meta>(file);
  const relative = path.relative(packageRoot, file);

  if (typeof meta.title !== 'string' || meta.title.trim() === '') {
    throw new Error(`${relative}: "title" must be a non-empty string.`);
  }
  if (
    !Array.isArray(meta.tags) ||
    meta.tags.some((tag) => typeof tag !== 'string' || tag.trim() === '')
  ) {
    throw new Error(`${relative}: "tags" must be an array of strings.`);
  }
  if (meta.description !== undefined && typeof meta.description !== 'string') {
    throw new Error(`${relative}: "description" must be a string.`);
  }

  return meta;
};

const findSvgFile = (dir: string) => {
  const svgs = fs.readdirSync(dir).filter((file) => file.endsWith('.svg'));
  const relative = path.relative(packageRoot, dir);

  if (svgs.length === 0) {
    throw new Error(`${relative}: no .svg file found.`);
  }
  if (svgs.length > 1) {
    throw new Error(
      `${relative}: expected exactly one .svg file, found ${svgs.join(', ')}.`,
    );
  }
  return path.join(dir, svgs[0]);
};

// ---------------------------------------------------------------------------
// Colour slots
// ---------------------------------------------------------------------------

const SLOT_MARKER = /^(.*?)\s*\[([^\]]*)\]\s*$/;

/** Parse `Former [brand1,brand2]` → { label: 'Former', colors: [...] }. */
const parseSlotMarker = (
  layerName: string,
  colors: IllustrationColor[],
  context: string,
) => {
  const match = layerName.match(SLOT_MARKER);
  if (!match) return null;

  const label = match[1].trim();
  const list = match[2]
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!label) {
    throw new Error(
      `${context}: layer "${layerName}" has no name before [...].`,
    );
  }
  if (list.length === 0) {
    throw new Error(
      `${context}: layer "${layerName}" has an empty colour list. Remove the brackets to keep the colour fixed.`,
    );
  }
  const known = new Set(colors.map((color) => color.name));
  for (const color of list) {
    if (!known.has(color)) {
      throw new Error(
        `${context}: layer "${layerName}" lists unknown colour "${color}". Use one of: ${[...known].join(', ')}.`,
      );
    }
  }
  return { label, colors: [...new Set(list)] };
};

/**
 * Find layers marked `Name [colour,…]` in the raw export and tag them with a
 * `data-varde-slot` attribute, before svgo strips `data-name`. Illustrator
 * writes the layer name verbatim to `data-name` (Export As → SVG with
 * "Object IDs: Layer Names"); the `id` has brackets flattened and is ignored.
 */
const markSlots = (
  svg: string,
  profile: string,
  name: string,
  colors: IllustrationColor[],
) => {
  const context = `${profile}/${name}`;
  const slots = new Map<string, IllustrationSlot>();

  const marked = svg.replace(
    /<([a-zA-Z][\w:-]*)(\s[^>]*?)(\/?)>/g,
    (tag, element: string, attributes: string, selfClosing: string) => {
      const layerName = attributes.match(/\sdata-name="([^"]*)"/)?.[1];
      if (!layerName) return tag;

      const marker = parseSlotMarker(layerName, colors, context);
      if (!marker) return tag;

      const slotName = slugify(marker.label);
      if (!SLUG_PATTERN.test(slotName)) {
        throw new Error(
          `${context}: layer "${layerName}" needs a name starting with a letter.`,
        );
      }
      const prop = toCamelCase(slotName);
      if (RESERVED_PROPS.has(prop)) {
        throw new Error(
          `${context}: layer name "${marker.label}" clashes with the "${prop}" prop – pick another name.`,
        );
      }

      const existing = slots.get(slotName);
      if (existing) {
        if (existing.colors.join() !== marker.colors.join()) {
          throw new Error(
            `${context}: layers named "${marker.label}" list different colours. Layers with the same name share one slot and must agree.`,
          );
        }
      } else {
        slots.set(slotName, {
          name: slotName,
          label: marker.label,
          prop,
          variable: `${VARIABLE_PREFIX}-${profile}-${name}-${slotName}`,
          default: '',
          colors: marker.colors,
        });
      }

      return `<${element}${attributes} ${SLOT_ATTRIBUTE}="${slotName}"${selfClosing}>`;
    },
  );

  return { marked, slots };
};

/**
 * svgo plugin that swaps palette colours for CSS variables. Inside a slotted
 * element, shapes drawn in the slot's colour get the slot variable (falling
 * back to the palette variable); everything else gets the palette variable.
 */
const themeColorsPlugin = (
  colors: IllustrationColor[],
  slots: Map<string, IllustrationSlot>,
  unknown: Set<string>,
): CustomPlugin => ({
  name: 'vardeThemeColors',
  fn: () => {
    const byHex = new Map(colors.map((color) => [color.light, color]));
    const stack: IllustrationSlot[] = [];

    return {
      element: {
        enter: (node: XastElement) => {
          const slotName = node.attributes[SLOT_ATTRIBUTE];
          const slot = slotName ? slots.get(slotName) : undefined;
          if (slot) stack.push(slot);
          const active = stack.at(-1);

          for (const attribute of COLOR_ATTRIBUTES) {
            const value = node.attributes[attribute];
            if (!value || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
              continue;
            }
            const color = byHex.get(normalizeHex(value));
            if (!color) {
              unknown.add(value);
              continue;
            }
            const paletteVar = `var(${color.variable}, ${color.light})`;

            // The first palette colour met inside a slot (the marked element
            // itself comes first) is the colour that slot swaps.
            if (active && !active.default) active.default = color.name;

            node.attributes[attribute] =
              active && active.default === color.name
                ? `var(${active.variable}, ${paletteVar})`
                : paletteVar;
          }
        },
        exit: (node: XastElement) => {
          if (node.attributes[SLOT_ATTRIBUTE]) {
            stack.pop();
            delete node.attributes[SLOT_ATTRIBUTE];
          }
        },
      },
    };
  },
});

/**
 * Optimise the SVG and swap palette colours for CSS variables. Any colour that
 * is not in the palette is left as-is and reported, so it can be added to
 * `colors.json` (or fixed in the SVG).
 */
const processSvg = (
  svg: string,
  profile: string,
  name: string,
  colors: IllustrationColor[],
) => {
  const context = `${profile}/${name}`;
  const { marked, slots } = markSlots(svg, profile, name, colors);
  const unknown = new Set<string>();

  // Pass 1: get every colour onto an attribute and swap it for a variable,
  // before preset-default merges paths or hoists attributes to groups.
  const themed = optimize(marked, {
    multipass: false,
    plugins: [
      'mergeStyles',
      { name: 'inlineStyles', params: { onlyMatchedOnce: false } },
      'convertStyleToAttrs',
      {
        name: 'convertColors',
        params: {
          currentColor: false,
          names2hex: true,
          rgb2hex: true,
          shorthex: false,
          shortname: false,
        },
      },
      themeColorsPlugin(colors, slots, unknown),
    ],
  }).data;

  // Pass 2: the usual optimisation.
  const optimized = optimize(themed, {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            // Keep full hex values so the palette lookup below is exact.
            convertColors: {
              currentColor: false,
              names2hex: true,
              rgb2hex: true,
              shorthex: false,
              shortname: false,
            },
          },
        },
      },
      // Several illustrations may be inlined on one page – keep ids unique.
      { name: 'prefixIds', params: { prefix: name } },
      // Drop the root width/height so the container decides the size, and
      // Illustrator's data-name attributes (the viewBox is kept – svgo 4 no
      // longer removes it by default).
      {
        name: 'removeAttrs',
        params: { attrs: ['svg:(width|height)', 'data-name'] },
      },
    ],
  }).data;

  // Colours inside `style=""` or `<style>` are not themed – flag them too.
  const byHex = new Set(colors.map((color) => color.light));
  for (const hex of optimized.match(HEX_PATTERN) ?? []) {
    if (!byHex.has(normalizeHex(hex))) unknown.add(hex);
  }
  if (unknown.size > 0) {
    console.warn(
      `  ⚠ ${context}: colour(s) ${[...unknown].join(', ')} are not in ${profile}/colors.json and will not follow the colour scheme.`,
    );
  }

  for (const slot of slots.values()) {
    if (!slot.default) {
      throw new Error(
        `${context}: layer "${slot.label}" is marked as a colour slot but no palette colour was found in it.`,
      );
    }
    if (!slot.colors.includes(slot.default)) {
      console.warn(
        `  ⚠ ${context}: layer "${slot.label}" is drawn in "${slot.default}" but does not list it – adding it.`,
      );
      slot.colors.unshift(slot.default);
    }
  }

  return { svg: optimized, slots: [...slots.values()] };
};

// ---------------------------------------------------------------------------
// React components
// ---------------------------------------------------------------------------

const buildReactComponent = async (
  svg: string,
  componentName: string,
  profile: string,
  slots: IllustrationSlot[],
) => {
  const code = await transform(
    svg,
    {
      plugins: ['@svgr/plugin-jsx'],
      typescript: true,
      jsxRuntime: 'automatic',
      ref: true,
      titleProp: true,
      dimensions: false,
      expandProps: 'end',
    },
    { componentName },
  );

  if (slots.length === 0) return code;

  // Add one typed prop per slot that sets the slot's CSS variable. This
  // rewrites SVGR's fixed output shape, so fail loudly if it ever changes.
  const signature =
    /\(\{\s*title,\s*titleId,\s*\.\.\.props\s*\}: SVGProps<SVGSVGElement> & SVGRProps, ref: Ref<SVGSVGElement>\) => (<svg[\s\S]*<\/svg>);/;
  if (!signature.test(code) || !code.includes('interface SVGRProps {')) {
    throw new Error(
      `Unexpected SVGR output for ${componentName}; cannot add slot props.`,
    );
  }

  const slotProps = slots
    .map(
      (slot) =>
        `  /** Colour of "${slot.label}". Defaults to "${slot.default}". */\n  ${slot.prop}?: ${slot.colors.map((color) => `'${color}'`).join(' | ')};`,
    )
    .join('\n');
  const slotVariables = slots
    .map((slot) => `'${slot.variable}': ${slot.prop}`)
    .join(', ');
  const destructured = slots.map((slot) => slot.prop).join(', ');

  return code
    .replace(
      'interface SVGRProps {',
      `interface SlotProps {\n${slotProps}\n}\ninterface SVGRProps {`,
    )
    .replace(
      signature,
      (_, jsx: string) =>
        `({ title, titleId, ${destructured}, style, ...rest }: SVGProps<SVGSVGElement> & SVGRProps & SlotProps, ref: Ref<SVGSVGElement>) => {\n` +
        `  const props = { ...rest, style: applySlots(style, '${VARIABLE_PREFIX}-${profile}', { ${slotVariables} }) };\n` +
        `  return ${jsx};\n};`,
    )
    .replace(/^/, "import { applySlots } from '../../index.js';\n");
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const buildProfile = async (profile: string) => {
  const profileDir = path.join(sourceDir, profile);
  const outDir = path.join(generatedDir, profile);
  const reactDir = path.join(outDir, 'react');
  fs.mkdirSync(reactDir, { recursive: true });

  const colors = readPalette(profile);
  const illustrations: Illustration[] = [];

  for (const name of listDirectories(profileDir)) {
    if (!SLUG_PATTERN.test(name)) {
      throw new Error(
        `Illustration folder "${profile}/${name}" must be kebab-case (a-z, 0-9, -) and start with a letter.`,
      );
    }

    const dir = path.join(profileDir, name);
    const meta = readMeta(dir);
    const rawSvg = fs.readFileSync(findSvgFile(dir), 'utf8');
    const { svg, slots } = processSvg(rawSvg, profile, name, colors);
    const componentName = toPascalCase(name);

    fs.writeFileSync(
      path.join(reactDir, `${componentName}.tsx`),
      await buildReactComponent(svg, componentName, profile, slots),
    );

    illustrations.push({
      name,
      componentName,
      exportName: toCamelCase(name),
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      viewBox: svg.match(/viewBox=["']([^"']+)["']/)?.[1],
      slots,
      svg,
    });
  }

  if (illustrations.length === 0) {
    console.warn(`  ⚠ ${profile}: no illustrations found.`);
  }

  // react/index.ts
  fs.writeFileSync(
    path.join(reactDir, 'index.ts'),
    [
      '// Generated by scripts/build-illustrations.ts – do not edit.',
      ...illustrations.map(
        (item) =>
          `export { default as ${item.componentName} } from './${item.componentName}.js';`,
      ),
      '',
    ].join('\n'),
  );

  // svg.ts
  fs.writeFileSync(
    path.join(outDir, 'svg.ts'),
    [
      '// Generated by scripts/build-illustrations.ts – do not edit.',
      '// Framework-agnostic SVG strings. Load `@digdir/varde/illustrations.css`',
      '// (or `@digdir/varde/illustrations/<profile>.css`) for dark mode support.',
      '',
      ...illustrations.map(
        (item) =>
          `export const ${item.exportName} = \`${escapeTemplateLiteral(item.svg)}\`;`,
      ),
      '',
    ].join('\n'),
  );

  // meta.ts
  const metaEntries = illustrations.map(({ svg: _svg, ...rest }) => rest);
  fs.writeFileSync(
    path.join(outDir, 'meta.ts'),
    [
      '// Generated by scripts/build-illustrations.ts – do not edit.',
      "import type { IllustrationColor, IllustrationMeta } from '../index.js';",
      '',
      `export const profile = ${JSON.stringify(profile)};`,
      '',
      `export const colors: IllustrationColor[] = ${JSON.stringify(colors, null, 2)};`,
      '',
      `export const illustrations: IllustrationMeta[] = ${JSON.stringify(metaEntries, null, 2)};`,
      '',
    ].join('\n'),
  );

  // <profile>.css
  const declarations = (mode: 'light' | 'dark') =>
    colors.map((color) => `  ${color.variable}: ${color[mode]};`).join('\n');
  const css = [
    `/* Generated by scripts/build-illustrations.ts – do not edit. */`,
    `/* Colours for the "${profile}" illustrations in @digdir/varde. */`,
    ':root,',
    `[data-color-scheme='light'] {`,
    declarations('light'),
    '}',
    '',
    `[data-color-scheme='dark'] {`,
    declarations('dark'),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    `  [data-color-scheme='auto'] {`,
    declarations('dark').replace(/^/gm, '  '),
    '  }',
    '}',
    '',
  ].join('\n');

  const slotCount = illustrations.reduce(
    (sum, item) => sum + item.slots.length,
    0,
  );
  console.log(
    `  ✓ ${profile}: ${illustrations.length} illustration(s), ${slotCount} colour slot(s)`,
  );
  return { profile, css };
};

const build = async () => {
  fs.rmSync(generatedDir, { recursive: true, force: true });
  fs.mkdirSync(generatedDir, { recursive: true });
  fs.mkdirSync(distDir, { recursive: true });

  const profiles = listDirectories(sourceDir);
  console.log(`Building illustrations for ${profiles.length} profile(s)…`);

  const results = [];
  for (const profile of profiles) {
    results.push(await buildProfile(profile));
  }

  for (const { profile, css } of results) {
    fs.writeFileSync(path.join(distDir, `${profile}.css`), css);
  }
  fs.writeFileSync(
    path.join(distDir, 'index.css'),
    results.map(({ css }) => css).join('\n'),
  );

  // Shared types, runtime helper and list of profiles: `@digdir/varde/illustrations`.
  fs.writeFileSync(
    path.join(generatedDir, 'index.ts'),
    [
      '// Generated by scripts/build-illustrations.ts – do not edit.',
      '',
      '/** Metadata for one illustration, from its `meta.json` and layer names. */',
      'export type IllustrationMeta = {',
      '  /** Folder name, kebab-case. Also the file name for downloads. */',
      '  name: string;',
      '  /** Named export in `@digdir/varde/illustrations/<profile>/react`. */',
      '  componentName: string;',
      '  /** Named export in `@digdir/varde/illustrations/<profile>/svg`. */',
      '  exportName: string;',
      '  title: string;',
      '  description?: string;',
      '  tags: string[];',
      '  viewBox?: string;',
      '  /** Recolourable parts, from layers named `Name [colour,…]`. */',
      '  slots: IllustrationSlot[];',
      '};',
      '',
      '/** One colour from a profile palette (`colors.json`). */',
      'export type IllustrationColor = {',
      '  name: string;',
      '  /** Human-readable name, e.g. "Rød". Falls back to `name`. */',
      '  label: string;',
      '  /** CSS custom property the illustrations reference, e.g. `--varde-illustration-digdir-figure`. */',
      '  variable: string;',
      '  light: string;',
      '  dark: string;',
      '};',
      '',
      '/** A recolourable part of an illustration. */',
      'export type IllustrationSlot = {',
      '  /** kebab-case id, unique within the illustration. */',
      '  name: string;',
      '  /** Layer name as written by the designer, e.g. "Former". */',
      '  label: string;',
      '  /** Prop on the React component, e.g. `former`. */',
      '  prop: string;',
      '  /** CSS custom property to set to a palette colour, e.g. `var(--varde-illustration-digdir-brand1)`. */',
      '  variable: string;',
      '  /** Palette colour the part is drawn in. */',
      '  default: string;',
      '  /** Palette colours the part may be changed to. */',
      '  colors: string[];',
      '};',
      '',
      '/** Profiles that ship illustrations. */',
      `export const illustrationProfiles = ${JSON.stringify(profiles)} as const;`,
      '',
      'export type IllustrationProfile = (typeof illustrationProfiles)[number];',
      '',
      '/**',
      ' * Merge slot colour choices into a `style` object as CSS variables. Used by',
      ' * the generated React components; handy for other frameworks too.',
      ' */',
      'export const applySlots = <T extends object>(',
      '  style: T | undefined,',
      '  palettePrefix: string,',
      '  slots: Record<string, string | undefined>,',
      '): T | undefined => {',
      '  const variables: Record<string, string> = {};',
      '  for (const [variable, color] of Object.entries(slots)) {',
      "    if (color) variables[variable] = 'var(' + palettePrefix + '-' + color + ')';",
      '  }',
      '  if (Object.keys(variables).length === 0) return style;',
      '  return { ...variables, ...style } as T;',
      '};',
      '',
    ].join('\n'),
  );
};

build().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
