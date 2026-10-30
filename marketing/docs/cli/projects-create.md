# ezhst projects create

Create a project.

## Usage

```
ezhst projects create <name> [--link]
```

`--link` also links the current folder to the new project.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst projects create --json
```

## Related commands

- [`ezhst projects list`](/docs/cli/projects-list): List your projects.
- [`ezhst projects info`](/docs/cli/projects-info): Show project details and its apps.
- [`ezhst projects rename`](/docs/cli/projects-rename): Change a project's display name.
- [`ezhst projects delete`](/docs/cli/projects-delete): Delete a project and everything in it.
- [`ezhst link`](/docs/cli/link): Link the current folder to a project and app.
