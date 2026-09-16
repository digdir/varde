/**
 * Browser-side export of an illustration: download as SVG, or rasterised to
 * PNG/WebP via a canvas, and copy as a PNG image for apps like PowerPoint that
 * paste SVG markup as text. Rasters are rendered with a transparent background
 * and their longest side at `RASTER_MAX_SIDE` pixels.
 */
const formats = {
  svg: { label: 'SVG', mime: 'image/svg+xml' },
  png: { label: 'PNG', mime: 'image/png' },
  webp: { label: 'WebP', mime: 'image/webp' },
} as const;

export type DownloadFormat = keyof typeof formats;

export const downloadFormats = (Object.keys(formats) as DownloadFormat[]).map(
  (format) => ({ format, label: formats[format].label }),
);

const RASTER_MAX_SIDE = 2048;

const saveBlob = (blob: Blob, fileName: string) => {
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

/** Pixel size for the raster, from the SVG's viewBox aspect ratio. */
const rasterSize = (viewBox?: string) => {
  const [, , width, height] = (viewBox ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (!width || !height) {
    return { width: RASTER_MAX_SIDE, height: RASTER_MAX_SIDE };
  }
  const scale = RASTER_MAX_SIDE / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

const loadImage = (svg: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(
      new Blob([svg], { type: formats.svg.mime }),
    );
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

const rasterize = async (
  svg: string,
  viewBox: string | undefined,
  format: Exclude<DownloadFormat, 'svg'>,
): Promise<Blob> => {
  const { width, height } = rasterSize(viewBox);
  // The generated SVGs have no width/height; browsers need them to size the
  // image before it is drawn onto the canvas.
  const sizedSvg = svg.replace(
    /<svg\b/,
    `<svg width="${width}" height="${height}"`,
  );
  const image = await loadImage(sizedSvg);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kunne ikke opprette bildet.');
  context.drawImage(image, 0, 0, width, height);

  const { mime } = formats[format];
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mime),
  );
  // Browsers without an encoder for the format silently fall back to PNG.
  if (!blob || blob.type !== mime) {
    throw new Error(
      `Nettleseren din kan ikke lage ${formats[format].label}-bilder. Prøv SVG eller PNG.`,
    );
  }
  return blob;
};

/**
 * Put the illustration on the clipboard as a PNG image. Office apps paste this
 * as a picture, whereas SVG markup on the clipboard is pasted as text.
 */
export const copyIllustrationImage = async (svg: string, viewBox?: string) => {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error(
      'Nettleseren din kan ikke kopiere bilder. Last ned PNG i stedet.',
    );
  }
  // Pass the pending blob rather than awaiting it first: Safari only allows
  // clipboard writes while the click is still "current".
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': rasterize(svg, viewBox, 'png') }),
  ]);
};

export const downloadIllustration = async ({
  svg,
  viewBox,
  fileName,
  format,
}: {
  svg: string;
  viewBox?: string;
  /** File name without extension. */
  fileName: string;
  format: DownloadFormat;
}) => {
  const blob =
    format === 'svg'
      ? new Blob([svg], { type: formats.svg.mime })
      : await rasterize(svg, viewBox, format);
  saveBlob(blob, `${fileName}.${format}`);
};
