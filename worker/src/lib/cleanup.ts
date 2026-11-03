import { PURGE_AFTER_DAYS } from "@zzal/shared/src/retention";
import { Env } from "../env";

interface PurgeCandidate {
  id: string;
  ext: string;
  has_thumb: number;
}

export async function purgeDeleted(env: Env): Promise<number> {
  const cutoff = Date.now() - PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const { results } = await env.DB.prepare(
    "SELECT id, ext, has_thumb FROM zzals WHERE deleted_at IS NOT NULL AND deleted_at < ?",
  )
    .bind(cutoff)
    .all<PurgeCandidate>();

  if (results.length === 0) return 0;

  for (const row of results) {
    await env.FILES.delete(`originals/${row.id}.${row.ext}`);
    if (row.has_thumb) {
      await env.FILES.delete(`thumbs/${row.id}.webp`);
    }
  }

  const placeholders = results.map(() => "?").join(",");
  await env.DB.prepare(`DELETE FROM zzals WHERE id IN (${placeholders})`)
    .bind(...results.map((row) => row.id))
    .run();

  return results.length;
}
