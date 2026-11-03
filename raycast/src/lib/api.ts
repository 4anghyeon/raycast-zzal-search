import { getPreferenceValues } from "@raycast/api";
import { Zzal } from "@zzal/shared/src/types";
import { readFile } from "fs/promises";
import { basename } from "path";
import * as store from "./store";

interface ApiErrorBody {
  code: string;
  message: string;
  item?: Zzal;
}

// fetch 응답은 unknown이라, 객체 형태만 가볍게 확인하고 나머지 필드 모양은 서버 구현을 신뢰한다.
async function parseJson<T>(res: Response): Promise<T> {
  const data: unknown = await res.json();
  if (typeof data !== "object" || data === null) {
    throw new Error("서버 응답 형식이 올바르지 않습니다");
  }
  return data as T;
}

async function readError(res: Response): Promise<ApiErrorBody> {
  try {
    const data = await parseJson<{ error: ApiErrorBody }>(res);
    return data.error;
  } catch {
    return { code: "UNKNOWN", message: `요청 실패 (${res.status})` };
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const { apiUrl, apiToken } = getPreferenceValues<Preferences>();
  const baseUrl = apiUrl.replace(/\/+$/, "");

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${apiToken}` },
  });
}

export async function fetchZzals(): Promise<Zzal[]> {
  const since = store.getLastSync();
  const res = await request(`/zzals?since=${since}`);
  if (!res.ok) {
    const error = await readError(res);
    throw new Error(error.message);
  }

  const data = await parseJson<{ items: Zzal[]; serverTime: number }>(res);
  store.mergeSync(data.items, data.serverTime, since === 0);
  return store.list();
}

export interface RegisterResult {
  status: "created" | "duplicate";
  item: Zzal;
}

export async function registerZzal(filePath: string, name: string, keywords: string[]): Promise<RegisterResult> {
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), basename(filePath));
  form.append("name", name);
  form.append("keywords", keywords.join(","));

  const res = await request("/zzals", { method: "POST", body: form });

  if (res.status === 409) {
    const error = await readError(res);
    if (error.item) {
      store.upsertLocal(error.item);
      return { status: "duplicate", item: error.item };
    }
  }
  if (!res.ok) {
    const error = await readError(res);
    throw new Error(error.message);
  }

  const item = await parseJson<Zzal>(res);
  store.upsertLocal(item);
  return { status: "created", item };
}

export async function updateZzal(id: string, patch: { name?: string; keywords?: string[] }): Promise<Zzal> {
  const res = await request(`/zzals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const error = await readError(res);
    throw new Error(error.message);
  }

  const item = await parseJson<Zzal>(res);
  store.upsertLocal(item);
  return item;
}

export async function fetchThumb(id: string): Promise<ArrayBuffer | null> {
  const res = await request(`/zzals/${id}/thumb`);
  if (!res.ok) return null;
  return res.arrayBuffer();
}

export async function fetchOriginal(id: string): Promise<ArrayBuffer | null> {
  const res = await request(`/zzals/${id}/file`);
  if (!res.ok) return null;
  return res.arrayBuffer();
}

export async function deleteZzal(id: string): Promise<void> {
  const res = await request(`/zzals/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const error = await readError(res);
    throw new Error(error.message);
  }
  store.removeLocal(id);
}
