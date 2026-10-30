# Deploy a Strapi app that uses pnpm

EasyHost picks pnpm when it finds `pnpm-lock.yaml`. There is nothing to configure, and these are the exact commands it runs for Strapi.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `pnpm-lock.yaml` |
| Install | `corepack enable pnpm && pnpm install --frozen-lockfile` |
| Build | `strapi build`, through your package build script |
| Start | `scripts.start`, which runs `strapi start` |

Scripts run with `pnpm run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

## Deploy

Use Postgres rather than SQLite, and set Strapi's secret variables before the first deploy.

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env set APP_KEYS=<a>,<b> API_TOKEN_SALT=<salt> ADMIN_JWT_SECRET=<secret> TRANSFER_TOKEN_SALT=<salt> JWT_SECRET=<secret>
npx ezhst env set DATABASE_CLIENT=postgres DATABASE_URL=<connection string>
npx ezhst env import .env
npx ezhst deploy
```

## Things to watch with pnpm

Corepack uses the version in the `packageManager` field when you set one. A stale lockfile fails `--frozen-lockfile`.

Commit `pnpm-lock.yaml`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [Strapi hub](/frameworks/strapi) for every Strapi guide, or [free Strapi hosting](/free-strapi-hosting) for what is included.

## Frequently asked questions

### How do I change the pnpm install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
