# Free Koa hosting

EasyHost runs Koa, a minimal Node.js web framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to 3 apps and 5 schedules per project

## How Koa builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | your package build script if you have one; skipped otherwise |
| Start | `scripts.start`, then `main`, `index.js` or `server.js` |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Listen on `process.env.PORT` and bind to `0.0.0.0`.

```src/index.ts
import Koa from "koa";

const app = new Koa();

app.use((ctx) => {
  ctx.body = "Hello from EasyHost";
});

app.listen(Number(process.env.PORT), "0.0.0.0");
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

Koa ships without a router or body parser. Add `@koa/router` and `koa-bodyparser` for the examples on this site.

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

See the [Koa hub](/frameworks/koa) for every Koa guide, or [free Koa hosting](/free-koa-hosting) for what is included. To let an agent do this for you, read [deploy Koa with Claude Code](/guides/deploy-koa-with-claude-code).

## Frequently asked questions

### Is Koa hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Koa app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Koa?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
