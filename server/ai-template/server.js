import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

app.use("/*", serveStatic({ root: "./public" }));

serve({ fetch: app.fetch, port: Number(process.env.PORT), hostname: "0.0.0.0" }, (info) => {
  console.log(`App listening on port ${info.port}`);
});
