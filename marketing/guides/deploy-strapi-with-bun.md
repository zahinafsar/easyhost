# Deploy a Strapi app that uses Bun

EasyHost picks Bun when it finds `bun.lock or bun.lockb`. There is nothing to configure, and these are the exact commands it runs for Strapi.

## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | `bun.lock or bun.lockb` |
| Install | `npm install -g bun && bun install --frozen-lockfile` |
| Build | `strapi build`, through your package build script |
| Start | `scripts.start`, which runs `strapi start` |

Scripts run with `bun run <script>`. Dev dependencies are available during the build, and the app runs with `NODE_ENV=production`.

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

## Things to watch with Bun

Bun installs and runs your scripts, but the base image is Node. Runtime APIs that only exist in Bun need a custom start command, such as `bun run src/index.ts`.

Commit `bun.lock or bun.lockb`. Without any lockfile, EasyHost falls back to `npm install`. To replace the install step, run `ezhst build set --install "<command>"`.

## Next steps

See the [Strapi hub](/frameworks/strapi) for every Strapi guide, or [free Strapi hosting](/free-strapi-hosting) for what is included.

## Frequently asked questions

### How do I change the Bun install command?

Run `ezhst build set --install "<command>"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection.
