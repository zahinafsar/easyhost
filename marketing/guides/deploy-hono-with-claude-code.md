# Deploy Hono with Claude Code

Install one skill, and Claude Code can create the project, set your variables and put your Hono app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Claude Code runs in your terminal, so it can run `ezhst` directly and read the JSON output.

If Claude Code does not discover the skill, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Claude Code to deploy

```Prompt
Deploy this Hono app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Hono needs no extra build settings, so the agent can run the standard deploy.

## Hono details to check

Use the `@hono/node-server` adapter so Hono runs as a Node.js server.

Bindings from Cloudflare Workers, such as KV or D1, do not exist here. Use `process.env`, the Postgres database and the S3 bucket.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a Hono app is unreachable](/errors/hono-app-unreachable). See the [Hono hub](/frameworks/hono) for every Hono guide, or [free Hono hosting](/free-hono-hosting) for what is included.

## Frequently asked questions

### Can Claude Code create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You must click the verification link in your inbox.

### Will Claude Code see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
