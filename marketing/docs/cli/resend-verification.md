# ezhst resend-verification

Email a new verification code.

## Usage

```
ezhst resend-verification
```

Use it when the code did not arrive or has expired. You can request a new code every 60 seconds.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst resend-verification --json
```

## Related commands

- [`ezhst register`](/docs/cli/register): Create an EasyHost account from the terminal.
- [`ezhst verify`](/docs/cli/verify): Verify your email with the 6-digit code.
- [`ezhst login`](/docs/cli/login): Log in and save your token.
- [`ezhst logout`](/docs/cli/logout): Remove the saved token from this machine.
- [`ezhst whoami`](/docs/cli/whoami): Show the logged in account.
- [`ezhst forgot-password`](/docs/cli/forgot-password): Send a password reset link.
