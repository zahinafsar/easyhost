# Free Remix hosting

EasyHost runs Remix, a full-stack React framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database, one S3 bucket and one email sender per project
- Up to five apps and five schedules per project

## How Remix builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | `remix vite:build`, through your package build script |
| Start | `scripts.start`, usually `remix-serve ./build/server/index.js` |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Use the default `@remix-run/serve` server. It reads `PORT` and `HOST`.

```package.json
{
  "scripts": {
    "build": "remix vite:build",
    "start": "remix-serve ./build/server/index.js"
  }
}
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

Remove platform adapters such as `@vercel/remix` so your loaders run on the plain Node.js runtime.

Apps run in one region, with no edge network, preview deployments or Git integration. Each project can send 20 emails per day, and one build runs at a time.

## Next steps

See the [Remix hub](/frameworks/remix) for every Remix guide, or [free Remix hosting](/free-remix-hosting) for what is included. To let an agent do this for you, read [deploy Remix with Claude Code](/guides/deploy-remix-with-claude-code).

## Frequently asked questions

### Is Remix hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Remix app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Remix?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
