import { env } from "./lib/env.js";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { authRoutes } from "./routes/auth.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { storageRoutes } from "./routes/storage.js";
import { databaseRoutes } from "./routes/databases.js";
import { emailRoutes } from "./routes/emails.js";
import { appRoutes } from "./routes/apps.js";
import { overviewRoutes } from "./routes/overview.js";
import { v1StorageRoutes } from "./routes/v1/storage.js";
import { v1EmailRoutes } from "./routes/v1/email.js";
import { syncAppRoutes } from "./lib/routing.js";
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
  .route("/overview", overviewRoutes)
  .route("/v1/storage", v1StorageRoutes)
  .route("/v1/email", v1EmailRoutes);

export type AppType = typeof routes;

const port = env.port;

const syncRoutes = () => {
  syncAppRoutes().catch((error) => console.error("Route sync failed", error));
};

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`EasyHost API listening on http://localhost:${info.port}`);
  syncRoutes();
  setInterval(syncRoutes, 60 * 1000);
  startBuildQueue().catch((error) => console.error("Build queue failed to start", error));
});
