/**
 * Browser-side helpers for turning SVG markup into files and images:
 * rasterise to PNG/WebP via a canvas, trigger a download, copy as an image.
 */
export const SVG_MIME = 'image/svg+xml';

export type RasterMime = 'image/png' | 'image/webp';

/** Trigger a download of `blob` as `fileName`. */
export const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};

/** Width and height of an SVG `viewBox` attribute value. */
export const viewBoxSize = (viewBox?: string) => {
  const [, , width, height] = (viewBox ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return width && height ? { width, height } : undefined;
};

const loadSvgImage = (svg: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: SVG_MIME }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Kunne ikke lese SVG-en.'));
    };
    image.src = url;
  });

/**
 * Render SVG markup to a raster of exactly `width` × `height` pixels with a
 * transparent background. Fonts and images referenced from outside the SVG
 * are not available while rasterising – embed them first.
 */
export const rasterizeSvg = async (
  svg: string,
  { width, height, mime }: { width: number; height: number; mime: RasterMime },
): Promise<Blob> => {
  // Browsers need explicit dimensions to size the image before drawing it.
  const sizedSvg = svg.replace(
    /<svg\b[^>]*>/,
    (root) =>
      `${root.replace(/\s(?:width|height)="[^"]*"/g, '').replace(/>$/, '')} width="${width}" height="${height}">`,
  );
  const image = await loadSvgImage(sizedSvg);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kunne ikke opprette bildet.');
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime),
  );
  // Browsers without an encoder for the format silently fall back to PNG.
  if (!blob || blob.type !== mime) {
    throw new Error(
      `Nettleseren din kan ikke lage ${mime === 'image/webp' ? 'WebP' : 'PNG'}-bilder.`,
    );
  }
  return blob;
};

/**
 * Put a PNG rendering of the SVG on the clipboard. Office apps paste this as
 * a picture, whereas SVG markup on the clipboard is pasted as text.
 */
export const copySvgAsImage = async (
  svg: string,
  size: { width: number; height: number },
) => {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error(
      'Nettleseren din kan ikke kopiere bilder. Last ned PNG i stedet.',
    );
  }
  // Pass the pending blob rather than awaiting it first: Safari only allows
  // clipboard writes while the click is still "current".
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': rasterizeSvg(svg, { ...size, mime: 'image/png' }),
    }),
  ]);
};
