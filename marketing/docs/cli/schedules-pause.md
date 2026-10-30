# ezhst schedules pause

Pause a schedule.

## Usage

```
ezhst schedules pause <id>
```

A request already in progress may still finish.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst schedules pause --json
```

## Related commands

- [`ezhst schedules list`](/docs/cli/schedules-list): List schedules.
- [`ezhst schedules create`](/docs/cli/schedules-create): Create a schedule.
- [`ezhst schedules update`](/docs/cli/schedules-update): Update a schedule.
- [`ezhst schedules resume`](/docs/cli/schedules-resume): Resume a schedule.
- [`ezhst schedules logs`](/docs/cli/schedules-logs): Show the latest 10 results.
- [`ezhst schedules delete`](/docs/cli/schedules-delete): Delete a schedule and its history.
