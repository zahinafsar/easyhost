# ezhst register

Create an EasyHost account from the terminal.

## Usage

```
ezhst register --name <name> --email <email> --password <password>
```

A default project is created and a verification email is sent. In a terminal, missing values are asked for interactively.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst register --name --json
```

## Related commands

- [`ezhst login`](/docs/cli/login): Log in and save your token.
- [`ezhst logout`](/docs/cli/logout): Remove the saved token from this machine.
- [`ezhst whoami`](/docs/cli/whoami): Show the logged in account.
- [`ezhst resend-verification`](/docs/cli/resend-verification): Send the verification email again.
- [`ezhst forgot-password`](/docs/cli/forgot-password): Send a password reset link.
