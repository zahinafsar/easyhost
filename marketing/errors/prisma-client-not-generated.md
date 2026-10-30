# @prisma/client did not initialize yet

The Prisma client was not generated during the build.

## The error

```
Error: @prisma/client did not initialize yet. Please run "prisma generate"
```

## Why it happens

The Prisma client was not generated during the build.

## How to fix it

Run `prisma generate` in your build command.

```
ezhst build set --build "prisma generate && npm run build"
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
