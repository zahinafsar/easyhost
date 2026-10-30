# Uploaded files disappear after deploy

Each deployment runs a new container, so the local disk does not persist.

## The error

```
Files saved to local disk are gone after a new deployment
```

## Why it happens

Each deployment runs a new container, so the local disk does not persist.

## How to fix it

Store files in the project's S3 bucket and data in Postgres.

```
ezhst storage create files
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
