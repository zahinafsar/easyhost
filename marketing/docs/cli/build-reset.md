# ezhst build reset

Reset every build setting to auto.

## Usage

```
ezhst build reset
```

Run `ezhst redeploy` afterwards to apply it.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst build reset --json
```

## Related commands

- [`ezhst build show`](/docs/cli/build-show): Show the current build settings.
- [`ezhst build set`](/docs/cli/build-set): Override one or more build settings.
