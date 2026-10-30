# NEXT_PUBLIC variable is undefined in the browser

Public variables are inlined during the build, so they must exist before it runs.

## The error

```
process.env.NEXT_PUBLIC_API_URL is undefined in the browser
```

## Why it happens

Public variables are inlined during the build, so they must exist before it runs.

## How to fix it

Set the variable, then rebuild. Changing it later also requires a rebuild.

```
ezhst env set NEXT_PUBLIC_API_URL=https://api.example.com
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
