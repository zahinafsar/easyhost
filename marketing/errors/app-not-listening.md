# Build succeeds, but the app is unreachable

The app is not listening on `0.0.0.0` and `PORT`, or it crashed at boot.

## The error

```
Deployment finished, but the URL returns a 502 or never loads
```

## Why it happens

The app is not listening on `0.0.0.0` and `PORT`, or it crashed at boot.

## How to fix it

Read the runtime logs, then bind to `0.0.0.0` on `process.env.PORT`. See the framework guide for the exact code.

```
ezhst logs --tail 200
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
