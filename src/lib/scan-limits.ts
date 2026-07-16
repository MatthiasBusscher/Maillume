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

export function getScreenshotDimensions(
  bytes: Uint8Array,
  file: Pick<FileLike, "type">,
): { width: number; height: number } | null {
  const type = file.type.trim().toLowerCase();

  if (type === "image/png" && bytes.length >= 24) {
    return {
      width: readUint32BigEndian(bytes, 16),
      height: readUint32BigEndian(bytes, 20),
    };
  }

  if (type === "image/gif" && bytes.length >= 10) {
    return {
      width: readUint16LittleEndian(bytes, 6),
      height: readUint16LittleEndian(bytes, 8),
    };
  }

  if (type === "image/jpeg") {
    return getJpegDimensions(bytes);
  }

  if (type === "image/webp") {
    return getWebpDimensions(bytes);
  }

  return null;
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

function getJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 1 >= bytes.length) {
      return null;
    }

    const segmentLength = readUint16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return {
        width: readUint16BigEndian(bytes, offset + 5),
        height: readUint16BigEndian(bytes, offset + 3),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function getWebpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const chunkType = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const chunkLength = readUint32LittleEndian(bytes, offset + 4);
    const dataOffset = offset + 8;

    if (chunkLength > bytes.length - dataOffset) {
      return null;
    }

    if (chunkType === "VP8X" && chunkLength >= 10) {
      return {
        width: 1 + readUint24LittleEndian(bytes, dataOffset + 4),
        height: 1 + readUint24LittleEndian(bytes, dataOffset + 7),
      };
    }

    if (chunkType === "VP8L" && chunkLength >= 5 && bytes[dataOffset] === 0x2f) {
      const bits = readUint32LittleEndian(bytes, dataOffset + 1);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >>> 14) & 0x3fff),
      };
    }

    if (
      chunkType === "VP8 " &&
      chunkLength >= 10 &&
      matchesBytes(bytes, [0x9d, 0x01, 0x2a], dataOffset + 3)
    ) {
      return {
        width: readUint16LittleEndian(bytes, dataOffset + 6) & 0x3fff,
        height: readUint16LittleEndian(bytes, dataOffset + 8) & 0x3fff,
      };
    }

    offset = dataOffset + chunkLength + (chunkLength % 2);
  }

  return null;
}

function readUint16BigEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32BigEndian(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}
