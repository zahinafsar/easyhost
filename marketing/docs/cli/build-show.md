# ezhst build show

Show the current build settings.

## Usage

```
ezhst build show
```

Empty settings are auto-detected.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst build show --json
```

## Related commands

- [`ezhst build set`](/docs/cli/build-set): Override one or more build settings.
- [`ezhst build reset`](/docs/cli/build-reset): Reset every build setting to auto.
