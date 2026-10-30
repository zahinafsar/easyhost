# Deploy a Nuxt app that uses Yarn

EasyHost picks Yarn when it finds `yarn.lock`. There is nothing to configure, and these are the exact commands it runs for Nuxt.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `yarn.lock` |
| Install | `corepack enable yarn && yarn install --frozen-lockfile` |
| Build | `nuxt build`, through your package build script |
| Start | `scripts.start`, or `node .output/server/index.mjs` when no start script exists |

Scripts run with `yarn run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Nothing to change. EasyHost detects Nuxt, and the Node server output reads `PORT` and `HOST`.

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

See the [Nuxt hub](/frameworks/nuxt) for every Nuxt guide, or [free Nuxt hosting](/free-nuxt-hosting) for what is included.

## Frequently asked questions

### How do I change the Yarn install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
