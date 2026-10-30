# ezhst email info

Show the sender address and usage.

## Usage

```
ezhst email info
```

A project can send 20 emails per day.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst email info --json
```

## Related commands

- [`ezhst email sender create`](/docs/cli/email-sender-create): Create the sender address.
- [`ezhst email sender delete`](/docs/cli/email-sender-delete): Delete the sender.
- [`ezhst email send`](/docs/cli/email-send): Send an email.
- [`ezhst email logs`](/docs/cli/email-logs): List sent emails.
