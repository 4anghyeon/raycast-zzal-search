import { useEffect, useState } from "react";

const CONCURRENCY = 6;

// shouldDownload를 만족하는 항목만 동시 CONCURRENCY개로 내려받는다.
// download가 저장까지 담당하고, true(저장됨)를 반환하면 리렌더를 트리거한다.
export function useBackgroundDownload<T>(
  items: T[],
  shouldDownload: (item: T) => boolean,
  download: (item: T) => Promise<boolean>,
): void {
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const targets = items.filter(shouldDownload);
    if (targets.length === 0) return;

    let cancelled = false;
    let index = 0;

    async function worker() {
      while (!cancelled) {
        const current = index++;
        if (current >= targets.length) return;

        const saved = await download(targets[current]);
        if (!cancelled && saved) {
          forceRerender((n) => n + 1);
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker());
    void Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [items]);
}
