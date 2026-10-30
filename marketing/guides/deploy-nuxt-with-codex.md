# Deploy Nuxt with Codex

Install one skill, and Codex can create the project, set your variables and put your Nuxt app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Run Codex in your project folder with network access enabled, because `ezhst` must reach the EasyHost API.

If Codex does not discover `.agents/skills`, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Codex to deploy

```Prompt
Deploy this Nuxt app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Nuxt needs no extra build settings, so the agent can run the standard deploy.

## Nuxt details to check

Nothing to change. EasyHost detects Nuxt, and the Node server output reads `PORT` and `HOST`.

Use the default `node-server` preset. Presets for serverless platforms do not produce `.output/server/index.mjs`.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a Nuxt app is unreachable](/errors/nuxt-app-unreachable). See the [Nuxt hub](/frameworks/nuxt) for every Nuxt guide, or [free Nuxt hosting](/free-nuxt-hosting) for what is included.

## Frequently asked questions

### Can Codex create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You must click the verification link in your inbox.

### Will Codex see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
