# ezhst env import

Merge variables from a .env file.

## Usage

```
ezhst env import <file>
```

`.env` files are never uploaded by `deploy`, so this is how their values reach your app.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst env import --json
```

## Related commands

- [`ezhst env list`](/docs/cli/env-list): List an app's environment variables.
- [`ezhst env set`](/docs/cli/env-set): Set one or more variables.
- [`ezhst env unset`](/docs/cli/env-unset): Remove one or more variables.
