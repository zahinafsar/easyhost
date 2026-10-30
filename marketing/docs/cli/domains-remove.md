# ezhst domains remove

Remove a custom domain.

## Usage

```
ezhst domains remove <hostname>
```

Remember to remove the DNS record as well.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst domains remove --json
```

## Related commands

- [`ezhst domains list`](/docs/cli/domains-list): List domains with the DNS target for each.
- [`ezhst domains add`](/docs/cli/domains-add): Add a custom domain to an app.
- [`ezhst domains verify`](/docs/cli/domains-verify): Check DNS, then issue HTTPS.
