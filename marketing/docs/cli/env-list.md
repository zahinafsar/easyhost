# ezhst env list

List an app's environment variables.

## Usage

```
ezhst env list
```

Agents should avoid printing secret values back to the user.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst env list --json
```

## Related commands

- [`ezhst env set`](/docs/cli/env-set): Set one or more variables.
- [`ezhst env unset`](/docs/cli/env-unset): Remove one or more variables.
- [`ezhst env import`](/docs/cli/env-import): Merge variables from a .env file.
