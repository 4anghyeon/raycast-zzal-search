import { Zzal } from "../types";
import { mockZzals } from "./mockData";

export async function fetchZzals(): Promise<Zzal[]> {
  return mockZzals;
}
