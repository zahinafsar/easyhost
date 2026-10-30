# SignatureDoesNotMatch from S3

The credentials are stale, or the client uses a different endpoint or region than expected.

## The error

```
SignatureDoesNotMatch: The request signature we calculated does not match
```

## Why it happens

The credentials are stale, or the client uses a different endpoint or region than expected.

## How to fix it

Use endpoint `https://storage.easyhost.fun` and region `us-east-1`, and refresh your keys from `storage info`.

```
ezhst storage info --json
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
