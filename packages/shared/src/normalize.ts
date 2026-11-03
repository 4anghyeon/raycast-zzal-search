export function normalizeName(name: string): string {
  return name.trim().normalize("NFC");
}

export function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of keywords) {
    const keyword = raw.trim().normalize("NFC").slice(0, 30);
    if (keyword === "" || seen.has(keyword)) continue;
    seen.add(keyword);
    result.push(keyword);
    if (result.length >= 20) break;
  }

  return result;
}
