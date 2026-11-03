import { Cache } from "@raycast/api";
import { Zzal } from "@zzal/shared/src/types";

interface CacheShape {
  items: Record<string, Zzal>;
  lastSync: number;
}

const cache = new Cache();
const KEY = "zzals";
const EMPTY_CACHE: CacheShape = { items: {}, lastSync: 0 };

function isCacheShape(value: unknown): value is CacheShape {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return typeof data.items === "object" && data.items !== null && typeof data.lastSync === "number";
}

function readCache(): CacheShape {
  const raw = cache.get(KEY);
  if (raw === undefined) return EMPTY_CACHE;

  const data: unknown = JSON.parse(raw);
  return isCacheShape(data) ? data : EMPTY_CACHE;
}

function writeCache(data: CacheShape): void {
  cache.set(KEY, JSON.stringify(data));
}

export function list(): Zzal[] {
  return Object.values(readCache().items).filter((zzal) => zzal.deletedAt === null);
}

export function findById(id: string): Zzal | undefined {
  return readCache().items[id];
}

export function getLastSync(): number {
  return readCache().lastSync;
}

// 서버 동기화 결과를 캐시에 병합한다. 삭제된 항목은 캐시에서도 제거한다.
// isFullSync면 응답을 그대로 전체로 간주해 로컬에만 남아있는 항목(완전 삭제된 행 등)도 정리한다.
export function mergeSync(items: Zzal[], serverTime: number, isFullSync: boolean): void {
  const data = readCache();
  const nextItems: Record<string, Zzal> = isFullSync ? {} : data.items;

  for (const item of items) {
    if (item.deletedAt !== null) {
      delete nextItems[item.id];
    } else {
      nextItems[item.id] = item;
    }
  }

  writeCache({ items: nextItems, lastSync: serverTime });
}

export function upsertLocal(item: Zzal): void {
  const data = readCache();
  data.items[item.id] = item;
  writeCache(data);
}

export function removeLocal(id: string): void {
  const data = readCache();
  delete data.items[id];
  writeCache(data);
}
