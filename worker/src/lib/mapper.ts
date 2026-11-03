import { Zzal } from "@zzal/shared/src/types";

export interface ZzalRow {
  id: string;
  name: string;
  keywords: string;
  mime: string;
  ext: string;
  size: number;
  width: number | null;
  height: number | null;
  has_thumb: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

function parseKeywords(raw: string): string[] {
  const data: unknown = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

const ZZAL_COLUMNS =
  "id, name, keywords, mime, ext, size, width, height, has_thumb, created_at, updated_at, deleted_at";

export async function findRowById(db: D1Database, id: string): Promise<ZzalRow | null> {
  const row = await db.prepare(`SELECT ${ZZAL_COLUMNS} FROM zzals WHERE id = ?`).bind(id).first<ZzalRow>();
  return row ?? null;
}

// since 생략 시 전체, 있으면 updated_at >= since (삭제된 항목도 포함해 동기화 클라이언트가 반영하게 한다).
export async function listRows(db: D1Database, since?: number): Promise<ZzalRow[]> {
  const statement =
    since !== undefined
      ? db.prepare(`SELECT ${ZZAL_COLUMNS} FROM zzals WHERE updated_at >= ?`).bind(since)
      : db.prepare(`SELECT ${ZZAL_COLUMNS} FROM zzals`);

  const { results } = await statement.all<ZzalRow>();
  return results;
}

export function rowToZzal(row: ZzalRow): Zzal {
  return {
    id: row.id,
    name: row.name,
    keywords: parseKeywords(row.keywords),
    mime: row.mime,
    ext: row.ext,
    size: row.size,
    width: row.width,
    height: row.height,
    hasThumb: row.has_thumb === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
