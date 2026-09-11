# `@digdir/varde`

Illustrations for Digdir's visual profiles, with light and dark mode support.
Icons and components will be added to the same package later.

Every profile (`digdir`, `uutilsynet`, …) has its own set of illustrations,
published as React components, as framework-agnostic SVG strings and with
metadata (title, description, tags) for building galleries.

## Installation

```bash
npm install @digdir/varde
```

## Usage

React components, one profile at a time:

```tsx
import { TelefonMedVarsel } from '@digdir/varde/illustrations/digdir/react';

<TelefonMedVarsel aria-hidden />
```

Illustrations are decorative by default – add `aria-hidden` when they carry no
information, or pass `title="…"` when they do.

Framework-agnostic SVG strings:

```ts
import { telefonMedVarsel } from '@digdir/varde/illustrations/digdir/svg';

element.innerHTML = telefonMedVarsel;
```

Metadata (for galleries, search and filtering):

```ts
import { colors, illustrations } from '@digdir/varde/illustrations/digdir/meta';
import type { IllustrationMeta } from '@digdir/varde/illustrations';
```

### Dark mode

Colours in the SVGs are written as
`var(--varde-illustration-<profile>-<colour>, <light hex>)`, so they render
correctly in light mode without any CSS. To follow `data-color-scheme="dark"`
(as set by Designsystemet), load the stylesheet for the profile – or one for
all profiles:

```ts
import '@digdir/varde/illustrations/digdir.css';
// or
import '@digdir/varde/illustrations.css';
```

## Adding an illustration

Illustrations live in `illustrations/<profile>/<name>/`:

```
illustrations/
  digdir/
    colors.json                  palette for this profile (light + dark)
    telefon-med-varsel/
      telefon-med-varsel.svg     exactly one .svg file (any file name)
      meta.json                  title, description and tags
```

1. Create a kebab-case folder – the name becomes the component name
   (`telefon-med-varsel` → `TelefonMedVarsel`) and the download file name.
2. Drop the SVG in the folder. Use colours from `colors.json` so they get
   themed; the build warns about colours it does not recognise.
3. Add `meta.json`:

   ```json
   {
     "$schema": "../../meta.schema.json",
     "title": "Telefon med varsel",
     "description": "Når og hvor illustrasjonen passer.",
     "tags": ["teknologi", "telefon"]
   }
   ```

4. Run `pnpm build`.

To add a new profile, create `illustrations/<profile>/colors.json` and at least
one illustration folder, then register a loader in the docs app
(`apps/www/app/_config/illustrations.ts`).

### `colors.json`

Each entry maps a colour name to its light and dark value. Any `fill`/`stroke`
in an SVG that matches a light value is replaced with the corresponding CSS
variable:

```json
{
  "figure": { "light": "#1E2B3C", "dark": "#384A5E" },
  "brand1": { "light": "#F45F63", "dark": "#F45F63" }
}
```

## Development

```bash
pnpm build       # generate + compile to dist/
pnpm typecheck   # type-check the build script
```

`scripts/build-illustrations.ts` generates TypeScript into `generated/`
(React components via SVGR, SVG strings, metadata) and CSS into `dist/`; `tsc`
then compiles `generated/` into `dist/`. Both folders are git-ignored.
