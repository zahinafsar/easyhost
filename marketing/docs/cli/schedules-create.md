# ezhst schedules create

Create a schedule.

## Usage

```
ezhst schedules create <name> --url <url> --every <minutes> [--method POST] [--headers '<json>'] [--body '<text>'] [--paused]
```

Intervals run from 1 to 43200 minutes. The first call follows one full interval.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst schedules create --json
```

## Related commands

- [`ezhst schedules list`](/docs/cli/schedules-list): List schedules.
- [`ezhst schedules update`](/docs/cli/schedules-update): Update a schedule.
- [`ezhst schedules pause`](/docs/cli/schedules-pause): Pause a schedule.
- [`ezhst schedules resume`](/docs/cli/schedules-resume): Resume a schedule.
- [`ezhst schedules logs`](/docs/cli/schedules-logs): Show the latest 10 results.
- [`ezhst schedules delete`](/docs/cli/schedules-delete): Delete a schedule and its history.
