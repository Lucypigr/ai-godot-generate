import { zipSync, strToU8 } from 'fflate';

export interface Rgba {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export function toCanvas(image: Rgba, scale = 1): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  const pixels = new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.width * image.height * 4);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), image.width, image.height), 0, 0);
  if (scale === 1) return canvas;
  const big = document.createElement('canvas');
  big.width = image.width * scale;
  big.height = image.height * scale;
  const bctx = big.getContext('2d')!;
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(canvas, 0, 0, big.width, big.height);
  return big;
}

/** Draws an RGBA image into an existing canvas, scaled with nearest neighbour and centred. */
export function paint(target: HTMLCanvasElement, image: Rgba, scale: number): void {
  const source = toCanvas(image);
  target.width = image.width * scale;
  target.height = image.height * scale;
  const ctx = target.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.drawImage(source, 0, 0, target.width, target.height);
}

export async function pngBytes(image: Rgba): Promise<Uint8Array> {
  const canvas = toCanvas(image);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

export function download(name: string, data: Uint8Array | string, type = 'application/octet-stream'): void {
  const part: BlobPart = typeof data === 'string' ? data : (data as Uint8Array<ArrayBuffer>);
  const url = URL.createObjectURL(new Blob([part], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadZip(name: string, files: Record<string, Uint8Array | string>): void {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, value] of Object.entries(files)) entries[path] = typeof value === 'string' ? strToU8(value) : value;
  download(name, zipSync(entries, { level: 6 }), 'application/zip');
}

export async function decodeImageFile(file: Blob): Promise<Rgba> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
  return { width: bitmap.width, height: bitmap.height, data: new Uint8Array(data.buffer) };
}

/** Lays equal-sized frames out on a grid. */
export function gridSheet(frames: Rgba[], columns: number, padding = 0): Rgba & { cells: { x: number; y: number; w: number; h: number }[] } {
  const w = Math.max(...frames.map(f => f.width));
  const h = Math.max(...frames.map(f => f.height));
  const cols = Math.max(1, Math.min(columns, frames.length));
  const rows = Math.ceil(frames.length / cols);
  const width = cols * (w + padding * 2);
  const height = rows * (h + padding * 2);
  const data = new Uint8Array(width * height * 4);
  const cells = frames.map((frame, i) => {
    const x = (i % cols) * (w + padding * 2) + padding + Math.floor((w - frame.width) / 2);
    const y = Math.floor(i / cols) * (h + padding * 2) + padding + (h - frame.height);
    blit(data, width, frame, x, y);
    return { x, y, w: frame.width, h: frame.height };
  });
  return { width, height, data, cells };
}

export function blit(target: Uint8Array, targetWidth: number, frame: Rgba, x: number, y: number): void {
  for (let row = 0; row < frame.height; row++) {
    const from = row * frame.width * 4;
    target.set(frame.data.subarray(from, from + frame.width * 4) as Uint8Array, ((y + row) * targetWidth + x) * 4);
  }
}

/** Nearest-neighbour upscale. */
export function scaleImage(image: Rgba, scale: number): Rgba {
  if (scale === 1) return image;
  const width = image.width * scale, height = image.height * scale;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = ((Math.floor(y / scale) * image.width) + Math.floor(x / scale)) * 4, d = (y * width + x) * 4;
      data[d] = image.data[s]; data[d + 1] = image.data[s + 1]; data[d + 2] = image.data[s + 2]; data[d + 3] = image.data[s + 3];
    }
  }
  return { width, height, data };
}

export const safeName = (name: string) => String(name || 'asset').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 64) || 'asset';

export { strToU8 };
