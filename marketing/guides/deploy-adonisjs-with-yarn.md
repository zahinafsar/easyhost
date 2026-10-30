# Deploy a AdonisJS app that uses Yarn

EasyHost picks Yarn when it finds `yarn.lock`. There is nothing to configure, and these are the exact commands it runs for AdonisJS.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `yarn.lock` |
| Install | `corepack enable yarn && yarn install --frozen-lockfile` |
| Build | `node ace build`, set as the build command |
| Start | `node build/bin/server.js`, set as the start command |

Scripts run with `yarn run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

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

## Things to watch with Yarn

Set `packageManager` in `package.json` to pin your Yarn version. Yarn Berry may need `--immutable`, which you can set with `ezhst build set --install`.

Commit `yarn.lock`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included.

## Frequently asked questions

### How do I change the Yarn install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
