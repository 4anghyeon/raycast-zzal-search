import { Zzal } from "@zzal/shared/src/types";
import { fetchOriginal } from "./api";
import { useBackgroundDownload } from "./background-sync";
import { hasCachedOriginal, saveOriginal } from "./files";

// 썸네일 생성이 실패한 항목(hasThumb=false)은 Grid 표시용으로 원본을 대신 받아둔다.
export function useOriginalFallbackSync(zzals: Zzal[]): void {
  useBackgroundDownload(
    zzals,
    (zzal) => !zzal.hasThumb && !hasCachedOriginal(zzal.id, zzal.ext),
    async (zzal) => {
      const data = await fetchOriginal(zzal.id);
      if (!data) return false;
      saveOriginal(zzal.id, zzal.ext, data);
      return true;
    },
  );
}
