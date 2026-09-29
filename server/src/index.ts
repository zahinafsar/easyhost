import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { storageRoutes } from "./routes/storage.js";
import { databaseRoutes } from "./routes/databases.js";
import { emailRoutes } from "./routes/emails.js";
import { appRoutes } from "./routes/apps.js";
import { v1EmailRoutes } from "./routes/v1/email.js";
import { env } from "./lib/env.js";
import { startBuildQueue } from "./lib/build-queue.js";

const app = new Hono().basePath("/api");

app.use(logger());

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: "Something went wrong" }, 500);
});

const routes = app
  .get("/health", (c) => c.json({ ok: true }))
  .route("/auth", authRoutes)
  .route("/api-keys", apiKeyRoutes)
  .route("/storage", storageRoutes)
  .route("/databases", databaseRoutes)
  .route("/emails", emailRoutes)
  .route("/apps", appRoutes)
  .route("/v1/email", v1EmailRoutes);

export type AppType = typeof routes;

const port = 48710;

const dashboardHost = new URL(env.appUrl).host;
const marketing = serveStatic({ root: "/app/public/marketing" });
const dashboard = serveStatic({ root: "/app/public/dashboard" });
const dashboardIndex = serveStatic({ root: "/app/public/dashboard", path: "index.html" });

const server = new Hono();

if (process.env.NODE_ENV === "production") {
  server.use("*", async (c, next) => {
    const host = c.req.header("host");
    if (host === `www.${env.appsDomain}`) {
      const url = new URL(c.req.url);
      return c.redirect(`https://${env.appsDomain}${url.pathname}${url.search}`, 301);
    }
    if (host === env.appsDomain) {
      return marketing(c, next);
    }
    if (host === dashboardHost && !c.req.path.startsWith("/api/")) {
      return dashboard(c, async () => {
        const res = await dashboardIndex(c, next);
        if (res) {
          c.res = res;
        }
      });
    }
    return next();
  });
}

server.route("/", app);

serve({ fetch: server.fetch, port }, (info) => {
  console.log(`EasyHost API listening on http://localhost:${info.port}`);
  startBuildQueue().catch((error) => console.error("Build queue failed to start", error));
});
