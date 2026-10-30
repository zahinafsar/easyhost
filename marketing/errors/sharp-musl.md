# sharp fails to load on Alpine

Builds run on `node:<version>-alpine`, which uses musl. An install made elsewhere may lack the musl binary.

## The error

```
Error: Could not load the "sharp" module using the linuxmusl-x64 runtime
```

## Why it happens

Builds run on `node:<version>-alpine`, which uses musl. An install made elsewhere may lack the musl binary.

## How to fix it

Let the build install it, and make sure the lockfile includes optional dependencies by regenerating it.

```
rm -rf node_modules package-lock.json
npm install
ezhst deploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
