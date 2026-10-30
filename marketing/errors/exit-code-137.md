# Container exits with code 137

Exit code 137 usually means the process was killed for going over its memory limit of 512 MB.

## The error

```
Process exited with code 137
```

## Why it happens

Exit code 137 usually means the process was killed for going over its memory limit of 512 MB.

## How to fix it

Reduce memory use. Look for large in-memory caches, big uploads held in memory, and too many database connections.

```
ezhst logs --tail 200
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
