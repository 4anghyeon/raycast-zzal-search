export const IMAGE_MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

export function mimeFromExt(ext: string): string {
  return IMAGE_MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

export function isSupportedImageExt(ext: string): boolean {
  return ext.toLowerCase() in IMAGE_MIME_BY_EXT;
}
