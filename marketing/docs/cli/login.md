# ezhst login

Log in and save your token.

## Usage

```
ezhst login --email <email> --password <password>
```

The token is saved in `~/.easyhost/config.json`. In CI, set `EZHST_TOKEN` instead.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst login --email --json
```

## Related commands

- [`ezhst register`](/docs/cli/register): Create an EasyHost account from the terminal.
- [`ezhst logout`](/docs/cli/logout): Remove the saved token from this machine.
- [`ezhst whoami`](/docs/cli/whoami): Show the logged in account.
- [`ezhst resend-verification`](/docs/cli/resend-verification): Send the verification email again.
- [`ezhst forgot-password`](/docs/cli/forgot-password): Send a password reset link.
