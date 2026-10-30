# Postgres connection rejected without TLS

EasyHost Postgres requires TLS, and your client connected without it.

## The error

```
no pg_hba.conf entry for host, no encryption
```

## Why it happens

EasyHost Postgres requires TLS, and your client connected without it.

## How to fix it

Use the full connection string from `ezhst db info`, including its `sslmode` parameter.

```
ezhst db info --json
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
