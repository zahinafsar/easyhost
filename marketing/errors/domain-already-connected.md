# Domain is already connected to an app

The hostname is attached to another EasyHost app.

## The error

```
www.example.com is already connected to an app
```

## Why it happens

The hostname is attached to another EasyHost app.

## How to fix it

Remove it from the other app first, then add it again.

```
ezhst domains remove www.example.com --app old-app
ezhst domains add www.example.com --app new-app
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
