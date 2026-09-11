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
 *   - `meta.ts`                               titles, tags, colours, view boxes
 * and, under `dist/illustrations/`, a `<profile>.css` with the colour
 * variables plus an `index.css` combining every profile.
 *
 * Hard-coded colours from the palette are replaced with
 * `var(--varde-illustration-<profile>-<colour>, <light hex>)`, so the SVGs
 * render correctly without the CSS and switch to the dark palette when the
 * CSS is loaded and `data-color-scheme="dark"` is set.
 *
 * Run with `node scripts/build-illustrations.ts` (Node ≥ 22.18 strips types),
 * then compile `generated/` with `tsc -p tsconfig.build.json`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from '@svgr/core';
import { optimize } from 'svgo';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const sourceDir = path.join(packageRoot, 'illustrations');
const generatedDir = path.join(packageRoot, 'generated', 'illustrations');
const distDir = path.join(packageRoot, 'dist', 'illustrations');

const VARIABLE_PREFIX = '--varde-illustration';

type ColorDefinition = { light: string; dark: string };
type Palette = Record<string, ColorDefinition>;

type Meta = {
  $schema?: string;
  title: string;
  description?: string;
  tags: string[];
};

type IllustrationColor = {
  name: string;
  variable: string;
  light: string;
  dark: string;
};

type Illustration = {
  name: string;
  componentName: string;
  exportName: string;
  title: string;
  description?: string;
  tags: string[];
  viewBox?: string;
  svg: string;
};

const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const HEX_PATTERN = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi;

const toPascalCase = (slug: string) =>
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const toCamelCase = (slug: string) => {
  const pascal = toPascalCase(slug);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

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

/**
 * Optimise the SVG and swap palette colours for CSS variables. Any colour that
 * is not in the palette is left as-is and reported, so it can be added to
 * `colors.json` (or fixed in the SVG).
 */
const processSvg = (
  svg: string,
  name: string,
  colors: IllustrationColor[],
  profile: string,
) => {
  const optimized = optimize(svg, {
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
      // Drop the root width/height so the container decides the size
      // (the viewBox is kept – svgo 4 no longer removes it by default).
      { name: 'removeAttrs', params: { attrs: ['svg:(width|height)'] } },
    ],
  }).data;

  const byHex = new Map(colors.map((color) => [color.light, color]));
  const unknown = new Set<string>();

  const themed = optimized.replace(
    /(fill|stroke|stop-color|flood-color|lighting-color)=(["'])(#[0-9a-f]{3,6})\2/gi,
    (match, attribute: string, quote: string, hex: string) => {
      const color = byHex.get(normalizeHex(hex));
      if (!color) {
        unknown.add(hex);
        return match;
      }
      return `${attribute}=${quote}var(${color.variable}, ${color.light})${quote}`;
    },
  );

  // Colours inside `style=""` or `<style>` are not themed – flag them too.
  for (const hex of themed.match(HEX_PATTERN) ?? []) {
    if (!byHex.has(normalizeHex(hex))) unknown.add(hex);
  }

  if (unknown.size > 0) {
    console.warn(
      `  ⚠ ${profile}/${name}: colour(s) ${[...unknown].join(', ')} are not in ${profile}/colors.json and will not follow the colour scheme.`,
    );
  }

  return themed;
};

const buildReactComponent = (svg: string, componentName: string) =>
  transform(
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
    const svg = processSvg(rawSvg, name, colors, profile);
    const componentName = toPascalCase(name);

    fs.writeFileSync(
      path.join(reactDir, `${componentName}.tsx`),
      await buildReactComponent(svg, componentName),
    );

    illustrations.push({
      name,
      componentName,
      exportName: toCamelCase(name),
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      viewBox: svg.match(/viewBox=["']([^"']+)["']/)?.[1],
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

  console.log(`  ✓ ${profile}: ${illustrations.length} illustration(s)`);
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

  // Shared types + list of profiles: `@digdir/varde/illustrations`.
  fs.writeFileSync(
    path.join(generatedDir, 'index.ts'),
    [
      '// Generated by scripts/build-illustrations.ts – do not edit.',
      '',
      '/** Metadata for one illustration, from its `meta.json`. */',
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
      '};',
      '',
      '/** One colour from a profile palette (`colors.json`). */',
      'export type IllustrationColor = {',
      '  name: string;',
      '  /** CSS custom property the illustrations reference, e.g. `--varde-illustration-digdir-figure`. */',
      '  variable: string;',
      '  light: string;',
      '  dark: string;',
      '};',
      '',
      '/** Profiles that ship illustrations. */',
      `export const illustrationProfiles = ${JSON.stringify(profiles)} as const;`,
      '',
      'export type IllustrationProfile = (typeof illustrationProfiles)[number];',
      '',
    ].join('\n'),
  );
};

build().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
