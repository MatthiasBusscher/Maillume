import type { Options, QRCode } from "jsqr";

const MAX_QR_PIXELS = 8_000_000;
const MAX_QR_LINK_LENGTH = 2_048;

export type QrDecoder = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: Options,
) => QRCode | null;

export async function extractQrHttpLinksFromImage(file: Blob): Promise<string[]> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return [];

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, Math.sqrt(MAX_QR_PIXELS / (bitmap.width * bitmap.height)));
    const width = Math.max(1, Math.floor(bitmap.width * scale));
    const height = Math.max(1, Math.floor(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(bitmap, 0, 0, width, height);

    const { default: decode } = await import("jsqr");
    return decodeQrHttpLinks(context.getImageData(0, 0, width, height), decode);
  } finally {
    bitmap.close();
  }
}

export function decodeQrHttpLinks(image: ImageData, decode: QrDecoder): string[] {
  const result = decode(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  const link = normalizeQrHttpLink(result?.data);
  return link ? [link] : [];
}

export function normalizeQrHttpLink(value: string | undefined): string | null {
  if (!value || value.length > MAX_QR_LINK_LENGTH) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
