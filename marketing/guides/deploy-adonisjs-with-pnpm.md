# Deploy a AdonisJS app that uses pnpm

EasyHost picks pnpm when it finds `pnpm-lock.yaml`. There is nothing to configure, and these are the exact commands it runs for AdonisJS.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `pnpm-lock.yaml` |
| Install | `corepack enable pnpm && pnpm install --frozen-lockfile` |
| Build | `node ace build`, set as the build command |
| Start | `node build/bin/server.js`, set as the start command |

Scripts run with `pnpm run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Set the build and start commands, plus `APP_KEY`, `LOG_LEVEL` and `SESSION_DRIVER` if your `start/env.ts` requires them.

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --build "node ace build" --start "node build/bin/server.js"
npx ezhst env set APP_KEY=<key> LOG_LEVEL=info
npx ezhst env import .env
npx ezhst deploy
```

## Things to watch with pnpm

Corepack uses the version in the `packageManager` field when you set one. A stale lockfile fails `--frozen-lockfile`.

Commit `pnpm-lock.yaml`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included.

## Frequently asked questions

### How do I change the pnpm install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
