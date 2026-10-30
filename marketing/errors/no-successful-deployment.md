# No successful deployment to redeploy

`redeploy` rebuilds an earlier upload, and this app does not have one it can use.

## The error

```
No successful deployment to redeploy
```

## Why it happens

`redeploy` rebuilds an earlier upload, and this app does not have one it can use.

## How to fix it

Run a full deploy from your app folder.

```
ezhst deploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
