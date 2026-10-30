# Each project can have at most 5 apps

The project already has five enabled apps.

## The error

```
Each project can have at most 5 apps.
```

## Why it happens

The project already has five enabled apps.

## How to fix it

Delete an app you no longer need, or create another project. An account can have 10.

```
ezhst apps list
ezhst projects create second-project --link
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
