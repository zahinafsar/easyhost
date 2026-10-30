# npm ci: package.json and package-lock.json are not in sync

A dependency changed without the lockfile being updated.

## The error

```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

## Why it happens

A dependency changed without the lockfile being updated.

## How to fix it

Regenerate the lockfile locally and deploy again.

```
rm -rf node_modules package-lock.json
npm install
ezhst deploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
