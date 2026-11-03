import { createHash } from "crypto";
import { readFile } from "fs/promises";

export async function hashFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex").slice(0, 16);
}
