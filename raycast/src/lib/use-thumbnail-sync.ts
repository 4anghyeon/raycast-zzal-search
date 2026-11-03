import { Zzal } from "@zzal/shared/src/types";
import { useEffect, useState } from "react";
import { fetchThumb } from "./api";
import { hasCachedThumb, saveThumb } from "./files";

const CONCURRENCY = 6;

// hasThumb인데 아직 로컬에 없는 썸네일만 동시 6개로 내려받고, 받아질 때마다 리렌더를 트리거한다.
export function useThumbnailSync(zzals: Zzal[]): void {
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const missing = zzals.filter((zzal) => zzal.hasThumb && !hasCachedThumb(zzal.id));
    if (missing.length === 0) return;

    let cancelled = false;
    let index = 0;

    async function worker() {
      while (!cancelled) {
        const current = index++;
        if (current >= missing.length) return;

        const data = await fetchThumb(missing[current].id);
        if (cancelled) return;
        if (data) {
          saveThumb(missing[current].id, data);
          forceRerender((n) => n + 1);
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, missing.length) }, () => worker());
    void Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [zzals]);
}
