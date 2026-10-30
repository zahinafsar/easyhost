# Too many database connections

Your pool opened more connections than allowed. Each database allows 20.

## The error

```
FATAL: sorry, too many clients already
```

## Why it happens

Your pool opened more connections than allowed. Each database allows 20.

## How to fix it

Set a smaller pool and share one client across your app.

```
postgresql://...?connection_limit=5
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
