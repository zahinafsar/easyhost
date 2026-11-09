# ezhst projects delete

Delete a project and everything in it.

## Usage

```
ezhst projects delete --yes
```

This removes all apps, deployments, schedules, storage and the database. It cannot be undone.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst projects delete --yes --json
```

## Related commands

- [`ezhst projects list`](/docs/cli/projects-list): List your projects.
- [`ezhst projects create`](/docs/cli/projects-create): Create a project.
- [`ezhst projects info`](/docs/cli/projects-info): Show project details and its apps.
- [`ezhst projects rename`](/docs/cli/projects-rename): Change a project's display name.
- [`ezhst link`](/docs/cli/link): Link the current folder to a project and app.
