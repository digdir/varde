/**
 * Export of an illustration: download as SVG, PNG or WebP, or copy as a PNG
 * image. Rasters are rendered with a transparent background and their longest
 * side at `RASTER_MAX_SIDE` pixels.
 */
import {
  copySvgAsImage,
  rasterizeSvg,
  SVG_MIME,
  saveBlob,
  viewBoxSize,
} from '~/_utils/svg-export';

const formats = {
  svg: { label: 'SVG', mime: SVG_MIME },
  png: { label: 'PNG', mime: 'image/png' },
  webp: { label: 'WebP', mime: 'image/webp' },
} as const;

export type DownloadFormat = keyof typeof formats;

export const downloadFormats = (Object.keys(formats) as DownloadFormat[]).map(
  (format) => ({ format, label: formats[format].label }),
);

const RASTER_MAX_SIDE = 2048;

/** Pixel size for the raster, from the SVG's viewBox aspect ratio. */
const rasterSize = (viewBox?: string) => {
  const size = viewBoxSize(viewBox);
  if (!size) return { width: RASTER_MAX_SIDE, height: RASTER_MAX_SIDE };
  const scale = RASTER_MAX_SIDE / Math.max(size.width, size.height);
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
};

export const copyIllustrationImage = (svg: string, viewBox?: string) =>
  copySvgAsImage(svg, rasterSize(viewBox));

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
      ? new Blob([svg], { type: SVG_MIME })
      : await rasterizeSvg(svg, {
          ...rasterSize(viewBox),
          mime: formats[format].mime,
        });
  saveBlob(blob, `${fileName}.${format}`);
};
