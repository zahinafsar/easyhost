# EADDRINUSE: address already in use

Your code starts two servers on the same port, often when an imported module also calls `listen`.

## The error

```
Error: listen EADDRINUSE: address already in use 0.0.0.0:3000
```

## Why it happens

Your code starts two servers on the same port, often when an imported module also calls `listen`.

## How to fix it

Make sure `listen` is called once, in your entry file.

```
grep -rn "listen(" src
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
