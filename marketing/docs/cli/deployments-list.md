# ezhst deployments list

List an app's deployments.

## Usage

```
ezhst deployments list
```

Shows each deployment's status.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst deployments list --json
```

## Related commands

- [`ezhst deploy`](/docs/cli/deploy): Package the current folder, upload it, build it and go live.
- [`ezhst redeploy`](/docs/cli/redeploy): Rebuild the latest upload.
- [`ezhst start`](/docs/cli/start): Start a stopped app.
- [`ezhst stop`](/docs/cli/stop): Stop a running app.
- [`ezhst logs`](/docs/cli/logs): Show runtime logs from the running app.
- [`ezhst deployments log`](/docs/cli/deployments-log): Show the full build log.
