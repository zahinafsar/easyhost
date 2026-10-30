# Deploy Strapi with Claude Code

Install one skill, and Claude Code can create the project, set your variables and put your Strapi app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Claude Code runs in your terminal, so it can run `ezhst` directly and read the JSON output.

If Claude Code does not discover `.agents/skills`, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Claude Code to deploy

```Prompt
Deploy this Strapi app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env set APP_KEYS=<a>,<b> API_TOKEN_SALT=<salt> ADMIN_JWT_SECRET=<secret> TRANSFER_TOKEN_SALT=<salt> JWT_SECRET=<secret>
npx ezhst env set DATABASE_CLIENT=postgres DATABASE_URL=<connection string>
npx ezhst env import .env
npx ezhst deploy
```

The skill tells the agent to read the build log and fix failures. For Strapi, expect it to run:

- `ezhst env set APP_KEYS=<a>,<b> API_TOKEN_SALT=<salt> ADMIN_JWT_SECRET=<secret> TRANSFER_TOKEN_SALT=<salt> JWT_SECRET=<secret>`
- `ezhst env set DATABASE_CLIENT=postgres DATABASE_URL=<connection string>`

## Strapi details to check

Use Postgres rather than SQLite, and set Strapi's secret variables before the first deploy.

Strapi's admin build is memory hungry and apps run with 512 MB of RAM, so large projects may not fit. The default local upload provider also loses files on redeploy, so use the S3 provider.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a Strapi app is unreachable](/errors/strapi-app-unreachable). See the [Strapi hub](/frameworks/strapi) for every Strapi guide, or [free Strapi hosting](/free-strapi-hosting) for what is included.

## Frequently asked questions

### Can Claude Code create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You must click the verification link in your inbox.

### Will Claude Code see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
