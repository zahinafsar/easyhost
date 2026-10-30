# ezhst CLI

Every EasyHost feature is available from one CLI with JSON output and no prompts in automation.

## What you get

- `--json` on every command, with progress on stderr
- Never prompts without a TTY, and names the missing flag instead
- `EZHST_TOKEN` for CI and agent sandboxes
- `--project` and `--app` flags to target any resource

## Try it

```
npx ezhst whoami --json
npx ezhst deploy --json
npx ezhst deployments log --json
```

## Limits

The CLI needs network access to the EasyHost API. See [pricing and limits](/pricing) for everything.

## Learn more

Read the [documentation](/docs/cli), or browse [guides by framework](/frameworks).
