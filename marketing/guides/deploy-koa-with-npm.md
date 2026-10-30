# Deploy a Koa app that uses npm

EasyHost picks npm when it finds `package-lock.json`. There is nothing to configure, and these are the exact commands it runs for Koa.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `package-lock.json` |
| Install | `npm ci` |
| Build | your package build script if you have one; skipped otherwise |
| Start | `scripts.start`, then `main`, `index.js` or `server.js` |

Scripts run with `npm run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Listen on `process.env.PORT` and bind to `0.0.0.0`.

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

## Things to watch with npm

`npm ci` fails if the lockfile and `package.json` disagree. Run `npm install` locally and deploy again. npm 11 lockfiles need Node 24.

Commit `package-lock.json`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [Koa hub](/frameworks/koa) for every Koa guide, or [free Koa hosting](/free-koa-hosting) for what is included.

## Frequently asked questions

### How do I change the npm install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
