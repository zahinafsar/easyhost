# Free Hono hosting

EasyHost runs Hono, a lightweight web framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database, one S3 bucket and one email sender per project
- Up to five apps and five schedules per project

## How Hono builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | your package build script if you have one; skipped otherwise |
| Start | `scripts.start`, then `main`, `index.js` or `server.js` |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Use the `@hono/node-server` adapter so Hono runs as a Node.js server.

```src/index.ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello from EasyHost"));

serve({ fetch: app.fetch, port: Number(process.env.PORT), hostname: "0.0.0.0" });
```

## Deploy it

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

## Limits and caveats

Bindings from Cloudflare Workers, such as KV or D1, do not exist here. Use `process.env`, the Postgres database and the S3 bucket.

Apps run in one region, with no edge network, preview deployments or Git integration. Each project can send 20 emails per day, and one build runs at a time.

## Next steps

See the [Hono hub](/frameworks/hono) for every Hono guide, or [free Hono hosting](/free-hono-hosting) for what is included. To let an agent do this for you, read [deploy Hono with Claude Code](/guides/deploy-hono-with-claude-code).

## Frequently asked questions

### Is Hono hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Hono app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Hono?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
