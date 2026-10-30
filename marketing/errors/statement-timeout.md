# Query timed out in the CLI

Statements run through the CLI and dashboard time out after 15 seconds.

## The error

```
ezhst db query times out after 15 seconds
```

## Why it happens

Statements run through the CLI and dashboard time out after 15 seconds.

## How to fix it

Run long statements with `psql` and the connection string.

```
psql "$DATABASE_URL" -f migration.sql
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
