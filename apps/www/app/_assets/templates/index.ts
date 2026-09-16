/**
 * SVG templates for the image generator. Add a template by dropping the
 * Illustrator export next to this file and listing it here.
 *
 * In Illustrator: every text object becomes an editable field, and a shape
 * whose layer name ends in `[image]` (e.g. "Bilde [image]") becomes an image
 * upload that fills the shape. Layer names are used as field labels.
 *
 * Illustrator does not export text alignment, so mark it in the layer name:
 * `Navn [center]` or `Dato [right]`. Text without a marker is left-aligned.
 */

import testTemplate from './test-template.svg?raw';
import testTemplateBilde from './test-template-bilde.svg?raw';

export type ImageTemplate = {
  /** Shown in the template chooser and used as the download file name. */
  name: string;
  svg: string;
};

export const imageTemplates = {
  'test-template': { name: 'Testmal (16:9)', svg: testTemplate },
  'test-template-bilde': { name: 'Testmal med bilde', svg: testTemplateBilde },
} satisfies Record<string, ImageTemplate>;

export type ImageTemplateId = keyof typeof imageTemplates;

export const imageTemplateIds = Object.keys(
  imageTemplates,
) as ImageTemplateId[];
