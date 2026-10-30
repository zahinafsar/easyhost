# Deploy a AdonisJS app that uses Bun

EasyHost picks Bun when it finds `bun.lock or bun.lockb`. There is nothing to configure, and these are the exact commands it runs for AdonisJS.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `bun.lock or bun.lockb` |
| Install | `npm install -g bun && bun install --frozen-lockfile` |
| Build | `node ace build`, set as the build command |
| Start | `node build/bin/server.js`, set as the start command |

Scripts run with `bun run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

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

## Things to watch with Bun

Bun installs and runs your scripts, but the base image is Node. Runtime APIs that only exist in Bun need a custom start command, such as `bun run src/index.ts`.

Commit `bun.lock or bun.lockb`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included.

## Frequently asked questions

### How do I change the Bun install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
