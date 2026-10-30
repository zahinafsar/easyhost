# Deploy Fastify with Cursor

Install one skill, and Cursor can create the project, set your variables and put your Fastify app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Use Cursor's agent mode with terminal access, so it can run `ezhst` commands in your project.

If Cursor does not discover `.agents/skills`, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Cursor to deploy

```Prompt
Deploy this Fastify app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Fastify needs no extra build settings, so the agent can run the standard deploy.

## Fastify details to check

Fastify binds to localhost by default, so you must pass `host: "0.0.0.0"`.

Forgetting `host` is the most common Fastify deploy failure: the build succeeds, but the app never receives traffic.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a Fastify app is unreachable](/errors/fastify-app-unreachable). See the [Fastify hub](/frameworks/fastify) for every Fastify guide, or [free Fastify hosting](/free-fastify-hosting) for what is included.

## Frequently asked questions

### Can Cursor create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You must click the verification link in your inbox.

### Will Cursor see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
