# Hono deploys, but the app is unreachable

If the build passes and the URL still fails, Hono is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

Pass `port: Number(process.env.PORT)` and `hostname: "0.0.0.0"` to `serve` from `@hono/node-server`.

```src/index.ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello from EasyHost"));

serve({ fetch: app.fetch, port: Number(process.env.PORT), hostname: "0.0.0.0" });
```

## Check the start command

Hono starts with `scripts.start`, then `main`, `index.js` or `server.js`.

```
npx ezhst build show
```

## Known cause for Hono

Bindings from Cloudflare Workers, such as KV or D1, do not exist here. Use `process.env`, the Postgres database and the S3 bucket.

See the [Hono hub](/frameworks/hono) for every Hono guide, or [free Hono hosting](/free-hono-hosting) for what is included.
