import { hashToId } from "@zzal/shared/src/hash";
import { normalizeKeywords, normalizeName } from "@zzal/shared/src/normalize";
import { Zzal } from "@zzal/shared/src/types";
import { Hono } from "hono";
import { Env } from "../env";
import { detectImageType } from "../lib/magic-bytes";
import { findRowById, listRows, rowToZzal } from "../lib/mapper";

export const zzalsRoute = new Hono<{ Bindings: Env }>();

const MAX_FILE_SIZE = 20 * 1024 * 1024; // D4

zzalsRoute.get("/", async (c) => {
  const sinceParam = c.req.query("since");
  const since = sinceParam !== undefined ? Number(sinceParam) : undefined;

  if (since !== undefined && Number.isNaN(since)) {
    return c.json({ error: { code: "INVALID_QUERY", message: "since는 숫자(epoch ms)여야 합니다" } }, 400);
  }

  const rows = await listRows(c.env.DB, since);
  return c.json({ items: rows.map(rowToZzal), serverTime: Date.now() });
});

zzalsRoute.post("/", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");
  const nameField = form.get("name");
  const keywordsField = form.get("keywords");

  if (!(file instanceof File)) {
    return c.json({ error: { code: "INVALID_FILE", message: "file 필드가 필요합니다" } }, 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: { code: "FILE_TOO_LARGE", message: "파일 크기는 20MB를 넘을 수 없습니다" } }, 413);
  }

  const buffer = await file.arrayBuffer();
  const detected = detectImageType(buffer);
  if (!detected) {
    return c.json({ error: { code: "UNSUPPORTED_FORMAT", message: "png/jpeg/gif/webp/avif만 지원합니다" } }, 415);
  }

  const id = await hashToId(buffer);
  const existing = await findRowById(c.env.DB, id);

  if (existing && existing.deleted_at === null) {
    return c.json({ error: { code: "DUPLICATE", message: "이미 등록된 짤방입니다", item: rowToZzal(existing) } }, 409);
  }

  const name = normalizeName(typeof nameField === "string" ? nameField : "");
  const keywords = normalizeKeywords(typeof keywordsField === "string" ? keywordsField.split(",") : []);

  await c.env.FILES.put(`originals/${id}.${detected.ext}`, buffer);

  const now = Date.now();
  const createdAt = existing?.created_at ?? now;

  await c.env.DB.prepare(
    `INSERT INTO zzals (id, name, keywords, mime, ext, size, width, height, has_thumb, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       keywords = excluded.keywords,
       updated_at = excluded.updated_at,
       deleted_at = NULL`,
  )
    .bind(id, name, JSON.stringify(keywords), detected.mime, detected.ext, file.size, createdAt, now)
    .run();

  const item: Zzal = {
    id,
    name,
    keywords,
    mime: detected.mime,
    ext: detected.ext,
    size: file.size,
    width: null,
    height: null,
    hasThumb: false,
    createdAt,
    updatedAt: now,
    deletedAt: null,
  };

  return c.json(item, 201);
});

interface PatchBody {
  name?: string;
  keywords?: string[];
}

function isPatchBody(value: unknown): value is PatchBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  if (body.name !== undefined && typeof body.name !== "string") return false;
  if (body.keywords !== undefined) {
    if (!Array.isArray(body.keywords) || !body.keywords.every((k) => typeof k === "string")) return false;
  }
  return true;
}

zzalsRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await findRowById(c.env.DB, id);

  if (!existing || existing.deleted_at !== null) {
    return c.json({ error: { code: "NOT_FOUND", message: "짤방을 찾을 수 없습니다" } }, 404);
  }

  const body: unknown = await c.req.json().catch(() => null);
  if (!isPatchBody(body)) {
    return c.json({ error: { code: "INVALID_BODY", message: "name, keywords 형식을 확인해주세요" } }, 400);
  }

  const current = rowToZzal(existing);
  const name = body.name !== undefined ? normalizeName(body.name) : current.name;
  const keywords = body.keywords !== undefined ? normalizeKeywords(body.keywords) : current.keywords;
  const now = Date.now();

  await c.env.DB.prepare("UPDATE zzals SET name = ?, keywords = ?, updated_at = ? WHERE id = ?")
    .bind(name, JSON.stringify(keywords), now, id)
    .run();

  const item: Zzal = { ...current, name, keywords, updatedAt: now };
  return c.json(item);
});

zzalsRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await findRowById(c.env.DB, id);

  if (!existing || existing.deleted_at !== null) {
    return c.json({ error: { code: "NOT_FOUND", message: "짤방을 찾을 수 없습니다" } }, 404);
  }

  const now = Date.now();
  await c.env.DB.prepare("UPDATE zzals SET deleted_at = ?, updated_at = ? WHERE id = ?").bind(now, now, id).run();

  return c.body(null, 204);
});
