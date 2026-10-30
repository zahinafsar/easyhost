# ezhst db info

Show the connection string, shadow connection string and tables.

## Usage

```
ezhst db info
```

Use `--json` to read `connectionString` and `shadowConnectionString`.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst db info --json
```

## Related commands

- [`ezhst db create`](/docs/cli/db-create): Create the project's Postgres database.
- [`ezhst db query`](/docs/cli/db-query): Run a SQL statement or file.
- [`ezhst db rows`](/docs/cli/db-rows): Browse rows in a table.
- [`ezhst db reset-password`](/docs/cli/db-reset-password): Rotate the password and print the new connection string.
- [`ezhst db delete`](/docs/cli/db-delete): Delete the database.
