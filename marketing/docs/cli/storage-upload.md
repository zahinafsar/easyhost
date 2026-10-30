# ezhst storage upload

Upload files to the bucket.

## Usage

```
ezhst storage upload <files...> [--prefix <path/>]
```

Files are public by URL once uploaded.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst storage upload --json
```

## Related commands

- [`ezhst storage info`](/docs/cli/storage-info): Show the bucket, public base URL and S3 credentials.
- [`ezhst storage create`](/docs/cli/storage-create): Create the project's bucket.
- [`ezhst storage rotate-keys`](/docs/cli/storage-rotate-keys): Issue new S3 credentials.
- [`ezhst storage ls`](/docs/cli/storage-ls): List files in the bucket.
- [`ezhst storage download`](/docs/cli/storage-download): Download a file from the bucket.
- [`ezhst storage rm`](/docs/cli/storage-rm): Delete a file.
- [`ezhst storage delete`](/docs/cli/storage-delete): Delete the bucket.
