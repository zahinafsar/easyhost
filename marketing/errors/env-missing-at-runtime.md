# Environment variable is undefined

`.env` files are never uploaded, so the app only sees variables set on EasyHost, and only after a new build.

## The error

```
process.env.DATABASE_URL is undefined
```

## Why it happens

`.env` files are never uploaded, so the app only sees variables set on EasyHost, and only after a new build.

## How to fix it

Import your variables, then redeploy.

```
ezhst env import .env
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
