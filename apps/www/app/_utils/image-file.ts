/**
 * Read an image file chosen by the user into a data URL, downscaled so the
 * longest side is at most `maxSide` pixels. Keeps PNG for transparency,
 * otherwise re-encodes as JPEG to keep the SVG and PNG exports small.
 */
export const readImageFile = async (file: File, maxSide = 2000) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Filen må være et bilde i PNG, JPEG eller WebP.');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Bildet kunne ikke leses. Prøv en annen fil.');
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Kunne ikke behandle bildet.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return file.type === 'image/png'
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', 0.9);
};
