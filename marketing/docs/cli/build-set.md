# ezhst build set

Override one or more build settings.

## Usage

```
ezhst build set [--node <v>] [--root-dir <dir>] [--install <cmd>] [--build <cmd>] [--start <cmd>]
```

Pass `""` to reset a field to auto. Node can be 20, 22 or 24.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst build set --json
```

## Related commands

- [`ezhst build show`](/docs/cli/build-show): Show the current build settings.
- [`ezhst build reset`](/docs/cli/build-reset): Reset every build setting to auto.
