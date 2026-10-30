# ezhst keys list

List API keys.

## Usage

```
ezhst keys list
```

Key values are not shown again.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst keys list --json
```

## Related commands

- [`ezhst keys create`](/docs/cli/keys-create): Create an API key.
- [`ezhst keys revoke`](/docs/cli/keys-revoke): Revoke an API key.
