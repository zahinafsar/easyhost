# package.json is not valid

The file contains invalid JSON, often a trailing comma or a merge conflict marker.

## The error

```
package.json is not a valid package.json
```

## Why it happens

The file contains invalid JSON, often a trailing comma or a merge conflict marker.

## How to fix it

Validate the file locally, fix it and deploy again.

```
node -e "JSON.parse(require('fs').readFileSync('package.json'))"
ezhst deploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
