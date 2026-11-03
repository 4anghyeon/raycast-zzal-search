import { Hono } from "hono";
import { authMiddleware } from "./auth";
import { purgeDeleted } from "./lib/cleanup";
import { Env } from "./env";
import { zzalsRoute } from "./routes/zzals";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.text("ok"));

app.use("/zzals*", authMiddleware);
app.route("/zzals", zzalsRoute);

export default {
  fetch: app.fetch,
  async scheduled(_controller, env) {
    const purged = await purgeDeleted(env);
    console.log(`영구 삭제 완료: ${purged}건`);
  },
} satisfies ExportedHandler<Env>;
