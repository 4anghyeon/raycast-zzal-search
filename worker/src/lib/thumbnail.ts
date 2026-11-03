import { Env } from "../env";

const THUMB_WIDTH = 320;

// 실패해도 등록 자체는 성공시켜야 하므로 null을 돌려주고 호출부에서 has_thumb=0으로 처리한다.
// anim: true로 GIF의 애니메이션을 그대로 유지한다 — Raycast Grid가 움직이는 썸네일을 보여준다.
export async function generateThumbnail(env: Env, buffer: ArrayBuffer): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const result = await env.IMAGES.input(new Blob([buffer]).stream())
      .transform({ width: THUMB_WIDTH })
      .output({ format: "image/webp", anim: true });
    return result.image();
  } catch (error) {
    console.error("썸네일 생성 실패:", error);
    return null;
  }
}
