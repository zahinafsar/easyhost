# No package.json found

`ezhst deploy` ran in a folder without `package.json`, or the root directory setting points to the wrong folder.

## The error

```
No package.json found in the project root.
```

## Why it happens

`ezhst deploy` ran in a folder without `package.json`, or the root directory setting points to the wrong folder.

## How to fix it

Run the command from your app's folder. In a monorepo, deploy from the repository root and set the app folder.

```
ezhst build set --root-dir apps/web
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
