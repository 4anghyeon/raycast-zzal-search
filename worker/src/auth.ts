import { createMiddleware } from "hono/factory";
import { Env } from "./env";

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token || token !== c.env.AUTH_TOKEN) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "인증 토큰이 올바르지 않습니다" } }, 401);
  }

  await next();
});
