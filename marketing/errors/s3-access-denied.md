# AccessDenied from S3

The keys were rotated, or they belong to another project's bucket. Each key pair is limited to its own bucket.

## The error

```
AccessDenied: Access Denied
```

## Why it happens

The keys were rotated, or they belong to another project's bucket. Each key pair is limited to its own bucket.

## How to fix it

Fetch the current keys and redeploy.

```
ezhst storage info --json
ezhst env set S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
