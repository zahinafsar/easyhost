# ezhst apps delete

Delete one app.

## Usage

```
ezhst apps delete --app <slug> --yes
```

Shared project services, such as the database and bucket, are kept.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst apps delete --app --json
```

## Related commands

- [`ezhst apps list`](/docs/cli/apps-list): List the apps in a project.
- [`ezhst apps create`](/docs/cli/apps-create): Create an app in a project.
