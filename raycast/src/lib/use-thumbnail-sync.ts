import { Zzal } from "@zzal/shared/src/types";
import { fetchThumb } from "./api";
import { useBackgroundDownload } from "./background-sync";
import { hasCachedThumb, saveThumb } from "./files";

export function useThumbnailSync(zzals: Zzal[]): void {
  useBackgroundDownload(
    zzals,
    (zzal) => zzal.hasThumb && !hasCachedThumb(zzal.id),
    async (zzal) => {
      const data = await fetchThumb(zzal.id);
      if (!data) return false;
      saveThumb(zzal.id, data);
      return true;
    },
  );
}
