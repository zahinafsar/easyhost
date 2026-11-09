# Free AdonisJS hosting

EasyHost runs AdonisJS, a batteries-included TypeScript framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to 3 apps and 5 schedules per project

## How AdonisJS builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | `node ace build`, set as the build command |
| Start | `node build/bin/server.js`, set as the start command |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Set the build and start commands, plus `APP_KEY`, `LOG_LEVEL` and `SESSION_DRIVER` if your `start/env.ts` requires them.

```start/env.ts
export default await Env.create(new URL("../", import.meta.url), {
  NODE_ENV: Env.schema.enum(["development", "production", "test"] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: "host" }),
  APP_KEY: Env.schema.string(),
  LOG_LEVEL: Env.schema.string(),
});
```

## Deploy it

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --build "node ace build" --start "node build/bin/server.js"
npx ezhst env set APP_KEY=<key> LOG_LEVEL=info
npx ezhst env import .env
npx ezhst deploy
```

## Limits and caveats

AdonisJS validates its environment at boot, so a missing `APP_KEY` stops the app before it listens. Check `ezhst logs`.

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included. To let an agent do this for you, read [deploy AdonisJS with Claude Code](/guides/deploy-adonisjs-with-claude-code).

## Frequently asked questions

### Is AdonisJS hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my AdonisJS app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for AdonisJS?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
