import { hashToId } from "@zzal/shared/src/hash";
import { readFile } from "fs/promises";

export async function hashFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return hashToId(buffer);
}
