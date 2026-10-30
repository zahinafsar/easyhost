# NoSuchBucket from S3

`S3_BUCKET` does not contain your real bucket name, which differs from the display name you chose.

## The error

```
NoSuchBucket: The specified bucket does not exist
```

## Why it happens

`S3_BUCKET` does not contain your real bucket name, which differs from the display name you chose.

## How to fix it

Read the name from `storage info`.

```
ezhst storage info --json
ezhst env set S3_BUCKET=<bucket>
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
