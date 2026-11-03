// id는 SHA-256 다이제스트의 앞 16자리 hex다. Raycast(Node)와 Worker 양쪽에서
// 전역 Web Crypto(`crypto.subtle`)로 동일하게 계산해 로직이 갈리지 않게 한다.
export async function hashToId(data: ArrayBuffer | Uint8Array): Promise<string> {
  // Node의 Buffer는 ArrayBufferLike 기반이라 BufferSource에 바로 안 맞을 수 있어 새 Uint8Array로 복사한다.
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 16);
}
