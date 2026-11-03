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
