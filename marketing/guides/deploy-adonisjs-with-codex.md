# Deploy AdonisJS with Codex

Install one skill, and Codex can create the project, set your variables and put your AdonisJS app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Run Codex in your project folder with network access enabled, because `ezhst` must reach the EasyHost API.

If Codex does not discover the skill, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Codex to deploy

```Prompt
Deploy this AdonisJS app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --build "node ace build" --start "node build/bin/server.js"
npx ezhst env set APP_KEY=<key> LOG_LEVEL=info
npx ezhst env import .env
npx ezhst deploy
```

The skill tells the agent to read the build log and fix failures. For AdonisJS, expect it to run:

- `ezhst build set --build "node ace build" --start "node build/bin/server.js"`
- `ezhst env set APP_KEY=<key> LOG_LEVEL=info`

## AdonisJS details to check

Set the build and start commands, plus `APP_KEY`, `LOG_LEVEL` and `SESSION_DRIVER` if your `start/env.ts` requires them.

AdonisJS validates its environment at boot, so a missing `APP_KEY` stops the app before it listens. Check `ezhst logs`.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a AdonisJS app is unreachable](/errors/adonisjs-app-unreachable). See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included.

## Frequently asked questions

### Can Codex create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You must click the verification link in your inbox.

### Will Codex see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
