# Prisma P3014: could not create the shadow database

Your database role cannot create databases, so Prisma needs an explicit shadow database.

## The error

```
P3014: Prisma Migrate could not create the shadow database
```

## Why it happens

Your database role cannot create databases, so Prisma needs an explicit shadow database.

## How to fix it

Use the shadow connection string from `ezhst db info`.

```
datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
