# sh: next: not found

The tool is not installed. It may be missing from `package.json`, or the install used the wrong folder.

## The error

```
sh: next: not found
```

## Why it happens

The tool is not installed. It may be missing from `package.json`, or the install used the wrong folder.

## How to fix it

Add the dependency locally and commit the lockfile. In a monorepo, check the root directory setting.

```
npm i next
ezhst build show
ezhst deploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
