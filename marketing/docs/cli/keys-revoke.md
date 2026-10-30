# ezhst keys revoke

Revoke an API key.

## Usage

```
ezhst keys revoke <id>
```

Requests using it stop working.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst keys revoke --json
```

## Related commands

- [`ezhst keys list`](/docs/cli/keys-list): List API keys.
- [`ezhst keys create`](/docs/cli/keys-create): Create an API key.
