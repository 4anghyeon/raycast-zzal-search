import { stat } from "fs/promises";
import { Zzal } from "../types";
import { hashFile } from "./hash";
import { mimeFromExt } from "./image";
import { normalizeKeywords, normalizeName } from "./normalize";
import * as store from "./store";

export async function fetchZzals(): Promise<Zzal[]> {
  return store.list();
}

export interface RegisterResult {
  status: "created" | "duplicate";
  item: Zzal;
}

export async function registerZzal(filePath: string, name: string, keywords: string[]): Promise<RegisterResult> {
  const id = await hashFile(filePath);
  const existing = store.findById(id);

  if (existing && existing.deletedAt === null) {
    return { status: "duplicate", item: existing };
  }

  const ext = filePath.split(".").pop() ?? "";
  const { size } = await stat(filePath);
  const now = Date.now();
  const item: Zzal = {
    id,
    name: normalizeName(name),
    keywords: normalizeKeywords(keywords),
    mime: mimeFromExt(ext),
    ext,
    size,
    width: null,
    height: null,
    hasThumb: false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
  };
  store.upsert(item);
  return { status: "created", item };
}

export async function updateZzal(id: string, patch: { name?: string; keywords?: string[] }): Promise<Zzal | undefined> {
  const normalizedPatch: Partial<Pick<Zzal, "name" | "keywords">> = {};
  if (patch.name !== undefined) normalizedPatch.name = normalizeName(patch.name);
  if (patch.keywords !== undefined) normalizedPatch.keywords = normalizeKeywords(patch.keywords);

  return store.update(id, normalizedPatch);
}

export async function deleteZzal(id: string): Promise<void> {
  store.softDelete(id);
}
