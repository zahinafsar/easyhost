# ezhst domains list

List domains with the DNS target for each.

## Usage

```
ezhst domains list
```

This is where you find the server IP for root domains.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst domains list --json
```

## Related commands

- [`ezhst domains add`](/docs/cli/domains-add): Add a custom domain to an app.
- [`ezhst domains verify`](/docs/cli/domains-verify): Check DNS, then issue HTTPS.
- [`ezhst domains remove`](/docs/cli/domains-remove): Remove a custom domain.
