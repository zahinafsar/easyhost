# husky fails during install

A `prepare` script expects a Git repository or a tool that is not present in the build. `.git` is not uploaded.

## The error

```
sh: husky: not found
```

## Why it happens

A `prepare` script expects a Git repository or a tool that is not present in the build. `.git` is not uploaded.

## How to fix it

Make the script safe when Git is absent.

```
"prepare": "husky || true"
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
