# Deploy a Koa app that uses Yarn

EasyHost picks Yarn when it finds `yarn.lock`. There is nothing to configure, and these are the exact commands it runs for Koa.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `yarn.lock` |
| Install | `corepack enable yarn && yarn install --frozen-lockfile` |
| Build | your package build script if you have one; skipped otherwise |
| Start | `scripts.start`, then `main`, `index.js` or `server.js` |

Scripts run with `yarn run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Listen on `process.env.PORT` and bind to `0.0.0.0`.

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

## Things to watch with Yarn

Set `packageManager` in `package.json` to pin your Yarn version. Yarn Berry may need `--immutable`, which you can set with `ezhst build set --install`.

Commit `yarn.lock`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [Koa hub](/frameworks/koa) for every Koa guide, or [free Koa hosting](/free-koa-hosting) for what is included.

## Frequently asked questions

### How do I change the Yarn install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
