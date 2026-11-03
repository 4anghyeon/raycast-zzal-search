import { hashToId } from "@zzal/shared/src/hash";
import { normalizeKeywords, normalizeName } from "@zzal/shared/src/normalize";
import { Zzal } from "@zzal/shared/src/types";
import { Hono } from "hono";
import { Env } from "../env";
import { detectImageType } from "../lib/magic-bytes";
import { rowToZzal, ZzalRow } from "../lib/mapper";

export const zzalsRoute = new Hono<{ Bindings: Env }>();

const MAX_FILE_SIZE = 20 * 1024 * 1024; // D4

zzalsRoute.get("/", (c) => {
  return c.json({ items: [], serverTime: Date.now() });
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
  const existing = await c.env.DB.prepare(
    "SELECT id, name, keywords, mime, ext, size, width, height, has_thumb, created_at, updated_at, deleted_at FROM zzals WHERE id = ?",
  )
    .bind(id)
    .first<ZzalRow>();

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
