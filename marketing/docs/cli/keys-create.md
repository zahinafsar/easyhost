# ezhst keys create

Create an API key.

## Usage

```
ezhst keys create <name>
```

It is shown only once, so store it with `ezhst env set EASYHOST_API_KEY=<key>`.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst keys create --json
```

## Related commands

- [`ezhst keys list`](/docs/cli/keys-list): List API keys.
- [`ezhst keys revoke`](/docs/cli/keys-revoke): Revoke an API key.
