# npm warn EBADENGINE unsupported engine

A package wants a different Node version than the build is using.

## The error

```
npm warn EBADENGINE Unsupported engine
```

## Why it happens

A package wants a different Node version than the build is using.

## How to fix it

Set `engines.node` in `package.json`, or choose the version directly. EasyHost supports 20, 22 and 24.

```
ezhst build set --node 22
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
