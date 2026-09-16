/**
 * Inlines the Inter font into SVG markup before it is rasterised.
 *
 * The site already loads Inter, and the `<text>` elements keep the font
 * settings Illustrator exported – but a canvas renders an SVG in an isolated
 * image document that cannot see the page's fonts, so without this the PNG
 * would fall back to a system font. The files are the same ones the page
 * loads, so they normally come straight from the browser cache.
 */
const FONT_BASE = 'https://altinncdn.no/fonts/inter/v4.1/';

const faces = {
  normal: 'InterVariable.woff2',
  italic: 'InterVariable-Italic.woff2',
} as const;

type FontStyle = keyof typeof faces;

const fontFaceCache = new Map<FontStyle, Promise<string>>();

const toBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/** `@font-face` rule for one style with the font file inlined, fetched once. */
const getFontFace = (style: FontStyle) => {
  let promise = fontFaceCache.get(style);
  if (!promise) {
    promise = fetch(FONT_BASE + faces[style])
      .then((response) => {
        if (!response.ok) throw new Error(response.statusText);
        return response.arrayBuffer();
      })
      .then(
        (buffer) =>
          `@font-face{font-family:Inter;font-style:${style};font-weight:100 900;src:url(data:font/woff2;base64,${toBase64(buffer)}) format('woff2')}`,
      )
      .catch((error) => {
        fontFaceCache.delete(style); // allow a retry
        throw new Error(`Kunne ikke laste skriften Inter (${error.message}).`);
      });
    fontFaceCache.set(style, promise);
  }
  return promise;
};

/** Add an inline `<style>` with the Inter faces the SVG uses. */
export const embedInterFont = async (svg: string) => {
  const styles: FontStyle[] = ['normal'];
  if (/font-style="italic"|Italic/.test(svg)) styles.push('italic');
  const rules = await Promise.all(styles.map(getFontFace));
  return svg.replace(
    /<svg\b[^>]*>/,
    (root) => `${root}<style>${rules.join('')}</style>`,
  );
};
