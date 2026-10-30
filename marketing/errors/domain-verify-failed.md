# Domain verification fails

The record has not propagated, the value is wrong, or a proxy such as Cloudflare is hiding it.

## The error

```
ezhst domains verify reports that DNS does not point to EasyHost
```

## Why it happens

The record has not propagated, the value is wrong, or a proxy such as Cloudflare is hiding it.

## How to fix it

Check the record, turn off any proxy and retry.

```
dig +short www.example.com
ezhst domains list
ezhst domains verify www.example.com
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
