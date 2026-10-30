# tsc: not found

TypeScript is not in `package.json`, so it was never installed. Dev dependencies are available during the build.

## The error

```
sh: tsc: not found
```

## Why it happens

TypeScript is not in `package.json`, so it was never installed. Dev dependencies are available during the build.

## How to fix it

Add it as a dev dependency and commit the lockfile.

```
npm i -D typescript
ezhst deploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
