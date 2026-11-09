# ezhst whoami

Show the logged in account.

## Usage

```
ezhst whoami
```

Agents run this first to check whether they need to log in.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst whoami --json
```

## Related commands

- [`ezhst register`](/docs/cli/register): Create an EasyHost account from the terminal.
- [`ezhst verify`](/docs/cli/verify): Verify your email with the 6-digit code.
- [`ezhst login`](/docs/cli/login): Log in and save your token.
- [`ezhst logout`](/docs/cli/logout): Remove the saved token from this machine.
- [`ezhst resend-verification`](/docs/cli/resend-verification): Email a new verification code.
- [`ezhst forgot-password`](/docs/cli/forgot-password): Send a password reset link.
