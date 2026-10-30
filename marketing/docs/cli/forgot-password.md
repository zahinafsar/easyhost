# ezhst forgot-password

Send a password reset link.

## Usage

```
ezhst forgot-password --email <email>
```

The link goes to the address on your account.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst forgot-password --email --json
```

## Related commands

- [`ezhst register`](/docs/cli/register): Create an EasyHost account from the terminal.
- [`ezhst login`](/docs/cli/login): Log in and save your token.
- [`ezhst logout`](/docs/cli/logout): Remove the saved token from this machine.
- [`ezhst whoami`](/docs/cli/whoami): Show the logged in account.
- [`ezhst resend-verification`](/docs/cli/resend-verification): Send the verification email again.
