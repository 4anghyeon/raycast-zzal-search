import { Hono } from "hono";
import { authMiddleware } from "./auth";
import { Env } from "./env";
import { zzalsRoute } from "./routes/zzals";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.text("ok"));

app.use("/zzals*", authMiddleware);
app.route("/zzals", zzalsRoute);

export default app;
