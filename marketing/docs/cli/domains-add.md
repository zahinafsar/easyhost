# ezhst domains add

Add a custom domain to an app.

## Usage

```
ezhst domains add <hostname>
```

Create the DNS record next, then verify.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst domains add --json
```

## Related commands

- [`ezhst domains list`](/docs/cli/domains-list): List domains with the DNS target for each.
- [`ezhst domains verify`](/docs/cli/domains-verify): Check DNS, then issue HTTPS.
- [`ezhst domains remove`](/docs/cli/domains-remove): Remove a custom domain.
