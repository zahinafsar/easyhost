# Deploy SvelteKit with Claude Code

Install one skill, and Claude Code can create the project, set your variables and put your SvelteKit app online. It costs $0, with no credit card.

## Install the skill

Run this in your project and choose Local or Global.

```
npx ezhst skill install
```

Claude Code runs in your terminal, so it can run `ezhst` directly and read the JSON output.

If Claude Code does not discover `.agents/skills`, ask it to read the installed `SKILL.md` or [skill.md](/skill.md) first.

## Tell Claude Code to deploy

```Prompt
Deploy this SvelteKit app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.
```

## What the agent runs

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npm i -D @sveltejs/adapter-node
npx ezhst build set --start "node build"
npx ezhst env import .env
npx ezhst deploy
```

The skill tells the agent to read the build log and fix failures. For SvelteKit, expect it to run:

- `npm i -D @sveltejs/adapter-node`
- `ezhst build set --start "node build"`

## SvelteKit details to check

Install `@sveltejs/adapter-node` and set it in `svelte.config.js`. The auto adapter is not enough.

Set the `ORIGIN` variable to your public URL. Without it, form actions fail with a cross-site POST error.

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

```
npx ezhst deployments log --json
npx ezhst logs --tail 200 --json
```

If the build passes but nothing loads, see [why a SvelteKit app is unreachable](/errors/sveltekit-app-unreachable). See the [SvelteKit hub](/frameworks/sveltekit) for every SvelteKit guide, or [free SvelteKit hosting](/free-sveltekit-hosting) for what is included.

## Frequently asked questions

### Can Claude Code create an EasyHost account for me?

Yes. The skill tells the agent to ask for your name, email and password and then register. You must click the verification link in your inbox.

### Will Claude Code see my secrets?

The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask.
