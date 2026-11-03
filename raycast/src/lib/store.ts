import { Cache } from "@raycast/api";
import { Zzal } from "../types";
import { mockZzals } from "./mockData";

const cache = new Cache();
const KEY = "zzals";

function parseZzals(raw: string): Zzal[] {
  const data: unknown = JSON.parse(raw);
  return Array.isArray(data) ? (data as Zzal[]) : [];
}

function readAll(): Zzal[] {
  const raw = cache.get(KEY);
  if (raw === undefined) {
    cache.set(KEY, JSON.stringify(mockZzals));
    return mockZzals;
  }
  return parseZzals(raw);
}

function writeAll(zzals: Zzal[]): void {
  cache.set(KEY, JSON.stringify(zzals));
}

export function list(): Zzal[] {
  return readAll().filter((zzal) => zzal.deletedAt === null);
}

export function findById(id: string): Zzal | undefined {
  return readAll().find((zzal) => zzal.id === id);
}

export function upsert(zzal: Zzal): void {
  const all = readAll();
  const idx = all.findIndex((item) => item.id === zzal.id);
  if (idx === -1) {
    all.push(zzal);
  } else {
    all[idx] = zzal;
  }
  writeAll(all);
}

export function update(id: string, patch: Partial<Pick<Zzal, "name" | "keywords">>): Zzal | undefined {
  const all = readAll();
  const idx = all.findIndex((item) => item.id === id);
  if (idx === -1) return undefined;

  const updated: Zzal = { ...all[idx], ...patch, updatedAt: Date.now() };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function softDelete(id: string): void {
  const all = readAll();
  const idx = all.findIndex((item) => item.id === id);
  if (idx === -1) return;

  const now = Date.now();
  all[idx] = { ...all[idx], deletedAt: now, updatedAt: now };
  writeAll(all);
}
