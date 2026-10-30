# Deploy a SvelteKit app that uses pnpm

EasyHost picks pnpm when it finds `pnpm-lock.yaml`. There is nothing to configure, and these are the exact commands it runs for SvelteKit.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `pnpm-lock.yaml` |
| Install | `corepack enable pnpm && pnpm install --frozen-lockfile` |
| Build | `vite build`, through your package build script |
| Start | `node build`, set as the start command or as `scripts.start` |

Scripts run with `pnpm run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Install `@sveltejs/adapter-node` and set it in `svelte.config.js`. The auto adapter is not enough.

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npm i -D @sveltejs/adapter-node
npx ezhst build set --start "node build"
npx ezhst env import .env
npx ezhst deploy
```

## Things to watch with pnpm

Corepack uses the version in the `packageManager` field when you set one. A stale lockfile fails `--frozen-lockfile`.

Commit `pnpm-lock.yaml`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [SvelteKit hub](/frameworks/sveltekit) for every SvelteKit guide, or [free SvelteKit hosting](/free-sveltekit-hosting) for what is included.

## Frequently asked questions

### How do I change the pnpm install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
