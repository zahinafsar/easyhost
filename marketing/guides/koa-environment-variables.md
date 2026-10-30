# Koa environment variables in production

`.env` files are never uploaded to EasyHost. Here is how to set variables for Koa, and when each one takes effect.

## How Koa reads variables

Koa has no browser bundle of its own, so every variable is server-only and read from `process.env` at runtime.

## Set your variables

```
npx ezhst env set SESSION_SECRET=change-me
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

See the [Koa hub](/frameworks/koa) for every Koa guide, or [free Koa hosting](/free-koa-hosting) for what is included.

## Frequently asked questions

### Are my .env files uploaded?

No. `ezhst deploy` skips every `.env*` file. Use `ezhst env set` or `ezhst env import`.
