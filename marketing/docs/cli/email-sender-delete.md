# ezhst email sender delete

Delete the sender.

## Usage

```
ezhst email sender delete
```

You can create a new one afterwards.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst email sender delete --json
```

## Related commands

- [`ezhst email info`](/docs/cli/email-info): Show the sender address and usage.
- [`ezhst email sender create`](/docs/cli/email-sender-create): Create the sender address.
- [`ezhst email send`](/docs/cli/email-send): Send an email.
- [`ezhst email logs`](/docs/cli/email-logs): List sent emails.
