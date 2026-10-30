# ezhst email sender create

Create the sender address.

## Usage

```
ezhst email sender create <username>
```

The address is `<username>@easyhost.fun`. Some usernames are reserved.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst email sender create --json
```

## Related commands

- [`ezhst email info`](/docs/cli/email-info): Show the sender address and usage.
- [`ezhst email sender delete`](/docs/cli/email-sender-delete): Delete the sender.
- [`ezhst email send`](/docs/cli/email-send): Send an email.
- [`ezhst email logs`](/docs/cli/email-logs): List sent emails.
