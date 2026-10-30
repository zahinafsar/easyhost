# Deploy a Next.js app that uses Bun

EasyHost picks Bun when it finds `bun.lock or bun.lockb`. There is nothing to configure, and these are the exact commands it runs for Next.js.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `bun.lock or bun.lockb` |
| Install | `npm install -g bun && bun install --frozen-lockfile` |
| Build | `next build`, through your package build script |
| Start | `scripts.start`, or `next start -H 0.0.0.0 -p $PORT` when no start script exists |

Scripts run with `bun run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Nothing to change. EasyHost detects Next.js and sets `PORT` and `HOSTNAME` for you.

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

## Things to watch with Bun

Bun installs and runs your scripts, but the base image is Node. Runtime APIs that only exist in Bun need a custom start command, such as `bun run src/index.ts`.

Commit `bun.lock or bun.lockb`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [Next.js hub](/frameworks/nextjs) for every Next.js guide, or [free Next.js hosting](/free-nextjs-hosting) for what is included.

## Frequently asked questions

### How do I change the Bun install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
