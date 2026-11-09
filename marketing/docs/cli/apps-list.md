# ezhst apps list

List the apps in a project.

## Usage

```
ezhst apps list
```

A project can have up to three apps, counting AI Builder apps.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst apps list --json
```

## Related commands

- [`ezhst apps create`](/docs/cli/apps-create): Create an app in a project.
- [`ezhst apps delete`](/docs/cli/apps-delete): Delete one app.
