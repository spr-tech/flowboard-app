/**
 * Packs square PNG images into one .ico file (the format browsers ask for at /favicon.ico).
 *
 * An .ico is a 6-byte header, a 16-byte directory entry per image, then the images themselves.
 * Since Windows Vista each image may simply be a PNG, so no bitmap conversion is needed.
 */
export type IcoImage = { size: number; png: Uint8Array };

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;

export function packIco(images: IcoImage[]): Uint8Array {
  if (images.length === 0) throw new Error("An .ico file needs at least one image.");

  const totalBytes = HEADER_BYTES + ENTRY_BYTES * images.length + images.reduce((sum, { png }) => sum + png.length, 0);
  const bytes = new Uint8Array(totalBytes);
  const view = new DataView(bytes.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type 1 = icon
  view.setUint16(4, images.length, true);

  let offset = HEADER_BYTES + ENTRY_BYTES * images.length;
  images.forEach(({ size, png }, index) => {
    if (size < 1 || size > 256) throw new Error(`Icon sizes must be 1–256px; got ${size}.`);
    const entry = HEADER_BYTES + ENTRY_BYTES * index;
    // Width and height are one byte each, where 0 means 256.
    view.setUint8(entry, size % 256);
    view.setUint8(entry + 1, size % 256);
    view.setUint8(entry + 2, 0); // colours in palette (none)
    view.setUint8(entry + 3, 0); // reserved
    view.setUint16(entry + 4, 1, true); // colour planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(png, offset);
    offset += png.length;
  });

  return bytes;
}
