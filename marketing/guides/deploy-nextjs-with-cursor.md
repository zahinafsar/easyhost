# Deploy Next.js with Cursor

Install one skill, and Cursor can create the project, set your variables and put your Next.js app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Use Cursor's agent mode with terminal access, so it can run `ezhst` commands in your project.

If Cursor does not discover the skill, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Cursor to deploy

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

### Can Cursor create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You then give the agent the 6-digit verification code from your inbox, and it runs `ezhst verify <code>` before anything else.

### Will Cursor see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
