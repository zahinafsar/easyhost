# Free Fastify hosting

EasyHost runs Fastify, a high-performance Node.js web framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to 3 apps and 5 schedules per project

## How Fastify builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | your package build script if you have one; skipped otherwise |
| Start | `scripts.start`, then `main`, `index.js` or `server.js` |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Fastify binds to localhost by default, so you must pass `host: "0.0.0.0"`.

```src/index.ts
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/", async () => {
  return { hello: "EasyHost" };
});

await app.listen({ port: Number(process.env.PORT), host: "0.0.0.0" });
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

Forgetting `host` is the most common Fastify deploy failure: the build succeeds, but the app never receives traffic.

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

See the [Fastify hub](/frameworks/fastify) for every Fastify guide, or [free Fastify hosting](/free-fastify-hosting) for what is included. To let an agent do this for you, read [deploy Fastify with Claude Code](/guides/deploy-fastify-with-claude-code).

## Frequently asked questions

### Is Fastify hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Fastify app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Fastify?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
