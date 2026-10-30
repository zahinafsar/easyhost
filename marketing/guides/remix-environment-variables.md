# Remix environment variables in production

`.env` files are never uploaded to EasyHost. Here is how to set variables for Remix, and when each one takes effect.

## How Remix reads variables

Loaders and actions read `process.env` on the server. To reach the browser, return values from a loader. Variables prefixed `VITE_` are inlined at build time.

## Set your variables

```
npx ezhst env set VITE_SITE_URL=https://my-app.easyhost.fun
npx ezhst env import .env
npx ezhst env list
npx ezhst redeploy
```

Variables apply on the next `deploy` or `redeploy`.

## What EasyHost provides

| Variable | Value | Available |
| --- | --- | --- |
| `NODE_ENV` | `production` | When the app runs, not during install or build |
| `PORT` | `3000` | Build and runtime |
| `HOST` | `0.0.0.0` | When the app runs |
| `HOSTNAME` | `0.0.0.0` | Build and runtime |

Your own variables are available in both the build and the running app.

## Common problems

- [Variable is undefined](/errors/env-missing-at-runtime) because it was only in a `.env` file
- [A public variable is undefined in the browser](/errors/public-env-undefined) because it changed after the build

See the [Remix hub](/frameworks/remix) for every Remix guide, or [free Remix hosting](/free-remix-hosting) for what is included.

## Frequently asked questions

### Are my .env files uploaded?

No. `ezhst deploy` skips every `.env*` file. Use `ezhst env set` or `ezhst env import`.
