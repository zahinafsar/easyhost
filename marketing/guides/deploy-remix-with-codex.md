# Deploy Remix with Codex

Install one skill, and Codex can create the project, set your variables and put your Remix app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Run Codex in your project folder with network access enabled, because `ezhst` must reach the EasyHost API.

If Codex does not discover the skill, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Codex to deploy

```Prompt
Deploy this Remix app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Remix needs no extra build settings, so the agent can run the standard deploy.

## Remix details to check

Use the default `@remix-run/serve` server. It reads `PORT` and `HOST`.

Remove platform adapters such as `@vercel/remix` so your loaders run on the plain Node.js runtime.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a Remix app is unreachable](/errors/remix-app-unreachable). See the [Remix hub](/frameworks/remix) for every Remix guide, or [free Remix hosting](/free-remix-hosting) for what is included.

## Frequently asked questions

### Can Codex create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You then give the agent the 6-digit verification code from your inbox, and it runs `ezhst verify <code>` before anything else.

### Will Codex see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
