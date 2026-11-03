import { environment } from "@raycast/api";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

const THUMBS_DIR = join(environment.supportPath, "thumbs");

export function thumbPath(id: string): string {
  return join(THUMBS_DIR, `${id}.webp`);
}

export function hasCachedThumb(id: string): boolean {
  return existsSync(thumbPath(id));
}

// 중간에 끊겨도 깨진 파일이 남지 않도록 임시 파일에 쓴 뒤 rename한다.
export function saveThumb(id: string, data: ArrayBuffer): void {
  mkdirSync(THUMBS_DIR, { recursive: true });
  const dest = thumbPath(id);
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, Buffer.from(data));
  renameSync(tmp, dest);
}
