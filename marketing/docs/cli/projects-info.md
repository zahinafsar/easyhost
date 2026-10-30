# ezhst projects info

Show project details and its apps.

## Usage

```
ezhst projects info
```

Uses the linked project unless you pass `--project <slug>`.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst projects info --json
```

## Related commands

- [`ezhst projects list`](/docs/cli/projects-list): List your projects.
- [`ezhst projects create`](/docs/cli/projects-create): Create a project.
- [`ezhst projects rename`](/docs/cli/projects-rename): Change a project's display name.
- [`ezhst projects delete`](/docs/cli/projects-delete): Delete a project and everything in it.
- [`ezhst link`](/docs/cli/link): Link the current folder to a project and app.
