# Deploy a NestJS app that uses npm

EasyHost picks npm when it finds `package-lock.json`. There is nothing to configure, and these are the exact commands it runs for NestJS.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `package-lock.json` |
| Install | `npm ci` |
| Build | `nest build`, through your package build script |
| Start | `scripts.start`, which you should point at the compiled output |

Scripts run with `npm run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Run the compiled app with `node dist/main` and listen on `process.env.PORT`.

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --start "node dist/main"
npx ezhst env import .env
npx ezhst deploy
```

## Things to watch with npm

`npm ci` fails if the lockfile and `package.json` disagree. Run `npm install` locally and deploy again. npm 11 lockfiles need Node 24.

Commit `package-lock.json`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [NestJS hub](/frameworks/nestjs) for every NestJS guide, or [free NestJS hosting](/free-nestjs-hosting) for what is included.

## Frequently asked questions

### How do I change the npm install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
