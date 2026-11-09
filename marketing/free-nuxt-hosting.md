# Free Nuxt hosting

EasyHost runs Nuxt, a full-stack Vue framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to 3 apps and 5 schedules per project

## How Nuxt builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | `nuxt build`, through your package build script |
| Start | `scripts.start`, or `node .output/server/index.mjs` when no start script exists |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Nothing to change. EasyHost detects Nuxt, and the Node server output reads `PORT` and `HOST`.

```package.json
{
  "scripts": {
    "build": "nuxt build"
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

Use the default `node-server` preset. Presets for serverless platforms do not produce `.output/server/index.mjs`.

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

See the [Nuxt hub](/frameworks/nuxt) for every Nuxt guide, or [free Nuxt hosting](/free-nuxt-hosting) for what is included. To let an agent do this for you, read [deploy Nuxt with Claude Code](/guides/deploy-nuxt-with-claude-code).

## Frequently asked questions

### Is Nuxt hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Nuxt app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Nuxt?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
