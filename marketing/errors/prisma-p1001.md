# Prisma P1001: Can't reach database server

The connection string is missing or wrong, or the password was rotated.

## The error

```
P1001: Can't reach database server
```

## Why it happens

The connection string is missing or wrong, or the password was rotated.

## How to fix it

Fetch the current string and update the variable.

```
ezhst db info --json
ezhst env set DATABASE_URL="postgresql://..."
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
