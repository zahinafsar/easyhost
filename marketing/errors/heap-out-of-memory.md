# JavaScript heap out of memory

The process needed more memory than was available. Apps run with 512 MB.

## The error

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

## Why it happens

The process needed more memory than was available. Apps run with 512 MB.

## How to fix it

Lower memory use, and cap the heap below the container limit so garbage collection runs earlier.

```
ezhst env set NODE_OPTIONS=--max-old-space-size=400
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
