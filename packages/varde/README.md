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

### Recolourable parts (colour slots)

Some illustrations have a part that may be shown in more than one brand
colour. Designers mark this in Illustrator by adding the allowed palette
colours in square brackets to the **layer name**:

```
Former [brand1,brand2,brand3]   may be shown in any of the three
Former [brand1,brand2]          only these two
Former                          fixed – no brackets, never recoloured
```

The build reads the marker from the exported `data-name` attribute, which
Illustrator only writes with *File → Export → Export As → SVG* and
*Object IDs: Layer Names* (the `id` has the brackets flattened and is ignored).
Rules:

- Colour names are the keys in `colors.json`. Unknown names fail the build.
- The colour the part is drawn in is the default. If it is missing from the
  list the build adds it and warns.
- Layers with the same name share one slot and must list the same colours.
  A marker on a group applies to every shape in it drawn in the slot's colour.
- The slot name comes from the text before the brackets: `Former` becomes the
  React prop `former` and the CSS variable
  `--varde-illustration-<profile>-<illustration>-former`.

Using a slot:

```tsx
<PersonerSomHolderFigurer former="brand1" aria-hidden />
```

```css
/* SVG strings: set the slot variable to a palette variable */
.hero svg {
  --varde-illustration-digdir-personer-som-holder-figurer-former:
    var(--varde-illustration-digdir-brand3);
}
```

`meta.ts` lists every slot (`slots[]`) with its variable, default and allowed
colours, which is what the documentation site uses for its colour dropdowns.

### `colors.json`

Each entry maps a colour name to its light and dark value. Any `fill`/`stroke`
in an SVG that matches a light value is replaced with the corresponding CSS
variable:

```json
{
  "figure": { "label": "Mørk blå", "light": "#1E2B3C", "dark": "#384A5E" },
  "brand1": { "label": "Rød", "light": "#F45F63", "dark": "#F45F63" }
}
```

`label` is optional and is what the documentation shows in colour dropdowns.

## Development

```bash
pnpm build       # generate + compile to dist/
pnpm typecheck   # type-check the build script
```

`scripts/build-illustrations.ts` generates TypeScript into `generated/`
(React components via SVGR, SVG strings, metadata) and CSS into `dist/`; `tsc`
then compiles `generated/` into `dist/`. Both folders are git-ignored.
