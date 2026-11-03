import { Hono } from "hono";
import { Env } from "../env";

export const zzalsRoute = new Hono<{ Bindings: Env }>();

// M2에서 D1 조회로 교체될 자리입니다. 지금은 인증 미들웨어 동작 확인용 뼈대입니다.
zzalsRoute.get("/", (c) => {
  return c.json({ items: [], serverTime: Date.now() });
});
