# Build artifact is larger than 500 MB

The upload is over the limit. `deploy` already skips `node_modules`, `.next`, `.git` and `.env*`, so large media or generated folders are usually the reason.

## The error

```
Build artifact is larger than 500 MB
```

## Why it happens

The upload is over the limit. `deploy` already skips `node_modules`, `.next`, `.git` and `.env*`, so large media or generated folders are usually the reason.

## How to fix it

Find the largest folders, then move media into your S3 bucket and delete generated output before deploying.

```
du -sh * | sort -h
ezhst storage upload big-video.mp4 --prefix media/
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
