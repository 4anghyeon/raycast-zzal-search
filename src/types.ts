export interface Zzal {
  id: string;
  name: string;
  keywords: string[];
  mime: string;
  ext: string;
  size: number;
  width: number | null;
  height: number | null;
  hasThumb: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}
