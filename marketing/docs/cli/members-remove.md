# ezhst members remove

Remove a member from the project.

## Usage

```
ezhst members remove <email> --yes
```

Owner only.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst members remove --json
```

## Related commands

- [`ezhst members list`](/docs/cli/members-list): List the project owner, members and pending invites.
- [`ezhst members invite`](/docs/cli/members-invite): Email an invite to join the project.
- [`ezhst members revoke`](/docs/cli/members-revoke): Revoke a pending invite.
- [`ezhst members leave`](/docs/cli/members-leave): Leave a project you were invited to.
- [`ezhst accept-invite`](/docs/cli/accept-invite): Join a project from an invite.
