# ezhst env unset

Remove one or more variables.

## Usage

```
ezhst env unset KEY [KEY...]
```

The change applies on the next `deploy` or `redeploy`.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst env unset KEY --json
```

## Related commands

- [`ezhst env list`](/docs/cli/env-list): List an app's environment variables.
- [`ezhst env set`](/docs/cli/env-set): Set one or more variables.
- [`ezhst env import`](/docs/cli/env-import): Merge variables from a .env file.
