# Deploy Next.js with Codex

Install one skill, and Codex can create the project, set your variables and put your Next.js app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Run Codex in your project folder with network access enabled, because `ezhst` must reach the EasyHost API.

If Codex does not discover the skill, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Codex to deploy

```Prompt
Deploy this Next.js app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

Next.js needs no extra build settings, so the agent can run the standard deploy.

## Next.js details to check

Nothing to change. EasyHost detects Next.js and sets `PORT` and `HOSTNAME` for you.

Middleware, image optimization and server actions run inside one container, in one region. There is no edge network.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a Next.js app is unreachable](/errors/nextjs-app-unreachable). See the [Next.js hub](/frameworks/nextjs) for every Next.js guide, or [free Next.js hosting](/free-nextjs-hosting) for what is included.

## Frequently asked questions

### Can Codex create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You must click the verification link in your inbox.

### Will Codex see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
