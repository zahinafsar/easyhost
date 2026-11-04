# ezhst skill install

Install the EasyHost agent skill for Claude Code, Codex or Cursor.

## Usage

```
ezhst skill install [--agent <claude|codex|cursor>] [--global | --local]
```

Without a TTY or with `--json`, pass `--agent` and exactly one of `--global` or `--local`.

## In scripts and agents

Add `--json` to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints `{"error": "..."}`. Without a TTY the CLI never prompts, so pass every value as a flag.

```
npx ezhst skill install --json
```
