/**
 * Browser-side download of an illustration as SVG, or rasterised to PNG/WebP
 * via a canvas. Rasters are rendered with a transparent background and their
 * longest side at `RASTER_MAX_SIDE` pixels.
 */
export type DownloadFormat = 'svg' | 'png' | 'webp';

export const downloadFormats: { format: DownloadFormat; label: string }[] = [
  { format: 'svg', label: 'SVG' },
  { format: 'png', label: 'PNG' },
  { format: 'webp', label: 'WebP' },
];

const RASTER_MAX_SIDE = 2048;

const mimeTypes: Record<DownloadFormat, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
};

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
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
  if (!width || !height)
    return { width: RASTER_MAX_SIDE, height: RASTER_MAX_SIDE };
  const scale = RASTER_MAX_SIDE / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

const loadImage = (svg: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: mimeTypes.svg }));
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
  format: 'png' | 'webp',
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

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeTypes[format]),
  );
  // Browsers without an encoder for the format silently fall back to PNG.
  if (!blob || blob.type !== mimeTypes[format]) {
    throw new Error(
      `Nettleseren din kan ikke lage ${format.toUpperCase()}-bilder. Prøv SVG eller PNG.`,
    );
  }
  return blob;
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
      ? new Blob([svg], { type: mimeTypes.svg })
      : await rasterize(svg, viewBox, format);
  saveBlob(blob, `${fileName}.${format}`);
};
