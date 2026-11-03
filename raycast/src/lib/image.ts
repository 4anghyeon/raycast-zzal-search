import { extname } from "path";

const IMAGE_MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
};

function extOf(filePath: string): string {
  return extname(filePath).slice(1).toLowerCase();
}

export function isImageFile(filePath: string): boolean {
  return extOf(filePath) in IMAGE_MIME_BY_EXT;
}

export function mimeFromExt(ext: string): string {
  return IMAGE_MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}
