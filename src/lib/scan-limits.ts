export const MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_SCREENSHOT_PIXELS = 20_000_000;
export const MAX_SCREENSHOT_DIMENSION = 8_000;
export const MAX_EML_SIZE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_ANALYSIS_MAX_REQUEST_BYTES = 32 * 1024;

export const SUPPORTED_SCREENSHOT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const SUPPORTED_EML_MIME_TYPES = ["message/rfc822"] as const;

export const SCREENSHOT_ACCEPT = SUPPORTED_SCREENSHOT_MIME_TYPES.join(",");
export const EML_ACCEPT = ".eml,message/rfc822";

type FileLike = {
  name: string;
  size: number;
  type: string;
};

export function isSupportedScreenshotFile(file: Pick<FileLike, "type">): boolean {
  return (SUPPORTED_SCREENSHOT_MIME_TYPES as readonly string[]).includes(
    file.type.trim().toLowerCase(),
  );
}

export function hasSupportedScreenshotSignature(
  bytes: Uint8Array,
  file: Pick<FileLike, "type">,
): boolean {
  const type = file.type.trim().toLowerCase();

  if (type === "image/png") {
    return matchesBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (type === "image/jpeg") {
    return matchesBytes(bytes, [0xff, 0xd8, 0xff]);
  }

  if (type === "image/gif") {
    return matchesText(bytes, "GIF87a") || matchesText(bytes, "GIF89a");
  }

  if (type === "image/webp") {
    return matchesText(bytes, "RIFF") && matchesText(bytes, "WEBP", 8);
  }

  return false;
}

export function isWithinScreenshotDimensionLimit(width: number, height: number): boolean {
  return (
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= MAX_SCREENSHOT_DIMENSION &&
    height <= MAX_SCREENSHOT_DIMENSION &&
    width * height <= MAX_SCREENSHOT_PIXELS
  );
}

export function isSupportedEmlFile(file: Pick<FileLike, "name" | "type">): boolean {
  const fileName = file.name.trim().toLowerCase();
  const fileType = file.type.trim().toLowerCase();

  return (
    fileName.endsWith(".eml") ||
    (SUPPORTED_EML_MIME_TYPES as readonly string[]).includes(fileType)
  );
}

export function isWithinFileSizeLimit(file: Pick<FileLike, "size">, maxBytes: number): boolean {
  return Number.isFinite(file.size) && file.size > 0 && file.size <= maxBytes;
}

export function getSerializedRequestSize(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

function matchesBytes(bytes: Uint8Array, expected: number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function matchesText(bytes: Uint8Array, expected: string, offset = 0): boolean {
  return matchesBytes(
    bytes,
    Array.from(expected, (character) => character.charCodeAt(0)),
    offset,
  );
}
