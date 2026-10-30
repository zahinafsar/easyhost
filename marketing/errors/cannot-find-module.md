# Error: Cannot find module

The start command points to a file that does not exist, often because no build ran or the output folder differs.

## The error

```
Error: Cannot find module './dist/index.js'
```

## Why it happens

The start command points to a file that does not exist, often because no build ran or the output folder differs.

## How to fix it

Check that a `build` script exists and that the start path matches its output.

```
ezhst deployments log
ezhst build set --start "node build/index.js"
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
