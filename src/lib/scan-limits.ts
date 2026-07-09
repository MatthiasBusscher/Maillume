export const MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_EML_SIZE_BYTES = 2 * 1024 * 1024;

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
