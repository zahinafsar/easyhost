# S3 client cannot resolve the bucket hostname

The client is using virtual-hosted URLs, which put the bucket in the hostname.

## The error

```
getaddrinfo ENOTFOUND my-bucket.storage.easyhost.fun
```

## Why it happens

The client is using virtual-hosted URLs, which put the bucket in the hostname.

## How to fix it

Turn on path-style requests.

```
forcePathStyle: true
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
