# Free Astro hosting

EasyHost runs Astro, a content-focused web framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database, one S3 bucket and one email sender per project
- Up to five apps and five schedules per project

## How Astro builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | `astro build`, through your package build script |
| Start | `node ./dist/server/entry.mjs`, set as the start command |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Install `@astrojs/node` in standalone mode and use on-demand rendering where you need a server.

```astro.config.mjs
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
});
```

## Deploy it

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx astro add node
npx ezhst build set --start "node ./dist/server/entry.mjs"
npx ezhst env import .env
npx ezhst deploy
```

## Limits and caveats

A purely static Astro site has no Node server, so it needs the Node adapter or a small static file server to run here.

Apps run in one region, with no edge network, preview deployments or Git integration. Each project can send 20 emails per day, and one build runs at a time.

## Next steps

See the [Astro hub](/frameworks/astro) for every Astro guide, or [free Astro hosting](/free-astro-hosting) for what is included. To let an agent do this for you, read [deploy Astro with Claude Code](/guides/deploy-astro-with-claude-code).

## Frequently asked questions

### Is Astro hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Astro app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Astro?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
