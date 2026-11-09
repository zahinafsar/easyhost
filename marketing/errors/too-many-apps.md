# Each project can have at most 3 apps

The project already has three apps. Node.js apps and AI Builder apps count toward the same limit.

## The error

```
Each project can have at most 3 apps.
```

## Why it happens

The project already has three apps. Node.js apps and AI Builder apps count toward the same limit.

## How to fix it

Delete an app you no longer need, or create another project. An account can have 3 projects.

```
ezhst apps list
ezhst projects create second-project --link
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
