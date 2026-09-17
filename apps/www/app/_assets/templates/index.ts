/**
 * SVG templates for the image generator. Add a template by dropping the
 * Illustrator export next to this file (kebab-case file name) and listing it
 * here. Templates are loaded on demand – an export with embedded images can
 * be megabytes, and it should not weigh down the page until chosen.
 *
 * In Illustrator: every text object becomes an editable field, and a shape
 * whose layer name ends in `[image]` (e.g. "Bilde [image]") becomes an image
 * upload that fills the shape. Layer names are used as field labels. The name
 * may sit on the object itself or on the layer/group that wraps only it.
 *
 * Illustrator does not export text alignment, so mark it in the layer name:
 * `Navn [center]` or `Dato [right]`. Text without a marker is left-aligned.
 */
export type ImageTemplate = {
  /** Shown in the template chooser and used as the download file name. */
  name: string;
  /** Loads the SVG markup. */
  load: () => Promise<string>;
};

const raw = (loader: () => Promise<{ default: string }>) => () =>
  loader().then((module) => module.default);

export const imageTemplates = {
  'test-template': {
    name: 'Testmal (16:9)',
    load: raw(() => import('./test-template.svg?raw')),
  },
  'test-template-bilde': {
    name: 'Testmal med bilde',
    load: raw(() => import('./test-template-bilde.svg?raw')),
  },
  'presentasjon-av-to-innledere': {
    name: 'Presentasjon av to innledere',
    load: raw(() => import('./presentasjon-av-to-innledere.svg?raw')),
  },
} satisfies Record<string, ImageTemplate>;

export type ImageTemplateId = keyof typeof imageTemplates;

export const imageTemplateIds = Object.keys(
  imageTemplates,
) as ImageTemplateId[];
