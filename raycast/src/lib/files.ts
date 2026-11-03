import { environment } from "@raycast/api";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";

const THUMBS_DIR = join(environment.supportPath, "thumbs");
const ORIGINALS_DIR = join(environment.supportPath, "originals");

export function thumbPath(id: string): string {
  return join(THUMBS_DIR, `${id}.webp`);
}

export function hasCachedThumb(id: string): boolean {
  return existsSync(thumbPath(id));
}

export function saveThumb(id: string, data: ArrayBuffer): void {
  saveFile(thumbPath(id), data);
}

export function originalPath(id: string, ext: string): string {
  return join(ORIGINALS_DIR, `${id}.${ext}`);
}

export function hasCachedOriginal(id: string, ext: string): boolean {
  return existsSync(originalPath(id, ext));
}

export function saveOriginal(id: string, ext: string, data: ArrayBuffer): void {
  saveFile(originalPath(id, ext), data);
}

// 중간에 끊겨도 깨진 파일이 남지 않도록 임시 파일에 쓴 뒤 rename한다.
function saveFile(dest: string, data: ArrayBuffer): void {
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, Buffer.from(data));
  renameSync(tmp, dest);
}
