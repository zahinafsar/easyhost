# Deploy Astro with Codex

Install one skill, and Codex can create the project, set your variables and put your Astro app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Run Codex in your project folder with network access enabled, because `ezhst` must reach the EasyHost API.

If Codex does not discover the skill, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Codex to deploy

```Prompt
Deploy this Astro app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx astro add node
npx ezhst build set --start "node ./dist/server/entry.mjs"
npx ezhst env import .env
npx ezhst deploy
```

The skill tells the agent to read the build log and fix failures. For Astro, expect it to run:

- `npx astro add node`
- `ezhst build set --start "node ./dist/server/entry.mjs"`

## Astro details to check

Install `@astrojs/node` in standalone mode and use on-demand rendering where you need a server.

A purely static Astro site has no Node server, so it needs the Node adapter or a small static file server to run here.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a Astro app is unreachable](/errors/astro-app-unreachable). See the [Astro hub](/frameworks/astro) for every Astro guide, or [free Astro hosting](/free-astro-hosting) for what is included.

## Frequently asked questions

### Can Codex create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You then give the agent the 6-digit verification code from your inbox, and it runs `ezhst verify <code>` before anything else.

### Will Codex see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
