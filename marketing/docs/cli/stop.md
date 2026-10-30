# ezhst stop

Stop a running app.

## Usage

```
ezhst stop
```

The app stays stopped until you start it or deploy again.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst stop --json
```

## Related commands

- [`ezhst deploy`](/docs/cli/deploy): Package the current folder, upload it, build it and go live.
- [`ezhst redeploy`](/docs/cli/redeploy): Rebuild the latest upload.
- [`ezhst start`](/docs/cli/start): Start a stopped app.
- [`ezhst logs`](/docs/cli/logs): Show runtime logs from the running app.
- [`ezhst deployments list`](/docs/cli/deployments-list): List an app's deployments.
- [`ezhst deployments log`](/docs/cli/deployments-log): Show the full build log.
