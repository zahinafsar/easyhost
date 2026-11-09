import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { logger } from "hono/logger";
import { readFileSync } from "node:fs";
import { authRoutes } from "./routes/auth.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { storageRoutes } from "./routes/storage.js";
import { databaseRoutes } from "./routes/databases.js";
import { emailRoutes } from "./routes/emails.js";
import { projectRoutes } from "./routes/projects.js";
import { inviteRoutes, memberRoutes } from "./routes/members.js";
import { aiAppRoutes } from "./routes/ai-apps.js";
import { resetStuckGenerations } from "./lib/ai-agent.js";
import { scheduleRoutes } from "./routes/schedules.js";
import { startScheduleWorker } from "./lib/schedule-worker.js";
import { appRoutes } from "./routes/apps.js";
import { adminRoutes } from "./routes/admin.js";
import { lemonSqueezyWebhookRoutes, tokenRoutes } from "./routes/tokens.js";
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
  .route("/projects", projectRoutes)
  .route("/members", memberRoutes)
  .route("/invites", inviteRoutes)
  .route("/schedules", scheduleRoutes)
  .route("/apps", appRoutes)
  .route("/ai-apps", aiAppRoutes)
  .route("/tokens", tokenRoutes)
  .route("/webhooks/lemonsqueezy", lemonSqueezyWebhookRoutes)
  .route("/admin", adminRoutes)
  .route("/v1/email", v1EmailRoutes);

export type AppType = typeof routes;

const port = 48710;

const dashboardHost = new URL(env.appUrl).host;
const marketingRoot = "/app/public/marketing";
const marketing = serveStatic({
  root: marketingRoot,
  precompressed: true,
  onFound: (path, c) => {
    if (path.includes(".html")) {
      c.header("Cache-Control", "public, max-age=300");
    } else {
      c.header("Cache-Control", "public, max-age=86400");
    }
    if (path.includes(".md") && !path.includes("skill.md")) {
      c.header("X-Robots-Tag", "noindex");
    }
  },
});
const dashboard = serveStatic({ root: "/app/public/dashboard" });
const dashboardIndex = serveStatic({ root: "/app/public/dashboard", path: "index.html" });

const server = new Hono();

if (process.env.NODE_ENV === "production") {
  const marketingNotFound = readFileSync(`${marketingRoot}/404.html`, "utf8");
  server.use("*", async (c, next) => {
    const host = c.req.header("host");
    if (host === `www.${env.appsDomain}`) {
      const url = new URL(c.req.url);
      return c.redirect(`https://${env.appsDomain}${url.pathname}${url.search}`, 301);
    }
    if (host === env.appsDomain) {
      const path = c.req.path;
      if (path.length > 1 && path.endsWith("/")) {
        const url = new URL(c.req.url);
        return c.redirect(`https://${env.appsDomain}${path.replace(/\/+$/, "")}${url.search}`, 301);
      }
      if (path.startsWith("/api/")) {
        return next();
      }
      const found = await marketing(c, async () => {});
      if (found) {
        return found;
      }
      return c.html(marketingNotFound, 404);
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
  startScheduleWorker();
  resetStuckGenerations().catch((error) => console.error("Failed to reset AI generations", error));
  startBuildQueue().catch((error) => console.error("Build queue failed to start", error));
});
