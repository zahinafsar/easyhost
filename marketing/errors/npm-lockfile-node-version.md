# npm ci rejects a lockfile made by a newer npm

Lockfiles from npm 11 need Node 24, because the npm bundled with older Node versions can reject them.

## The error

```
npm ci fails with a lockfile created by npm 11
```

## Why it happens

Lockfiles from npm 11 need Node 24, because the npm bundled with older Node versions can reject them.

## How to fix it

Use Node 24, which is the default unless `engines.node` says otherwise.

```
ezhst build set --node 24
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
