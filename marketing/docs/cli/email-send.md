# ezhst email send

Send an email.

## Usage

```
ezhst email send --from <address> --to <address> --subject <text> (--text <body> | --html <html>)
```

From app code, use the HTTP API with an API key.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst email send --from --json
```

## Related commands

- [`ezhst email info`](/docs/cli/email-info): Show the sender address and usage.
- [`ezhst email sender create`](/docs/cli/email-sender-create): Create the sender address.
- [`ezhst email sender delete`](/docs/cli/email-sender-delete): Delete the sender.
- [`ezhst email logs`](/docs/cli/email-logs): List sent emails.
