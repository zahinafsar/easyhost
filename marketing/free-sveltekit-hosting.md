# Free SvelteKit hosting

EasyHost runs SvelteKit, a full-stack Svelte framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to 3 apps and 5 schedules per project

## How SvelteKit builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | `vite build`, through your package build script |
| Start | `node build`, set as the start command or as `scripts.start` |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Install `@sveltejs/adapter-node` and set it in `svelte.config.js`. The auto adapter is not enough.

```svelte.config.js
import adapter from "@sveltejs/adapter-node";

export default {
  kit: {
    adapter: adapter(),
  },
};
```

## Deploy it

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npm i -D @sveltejs/adapter-node
npx ezhst build set --start "node build"
npx ezhst env import .env
npx ezhst deploy
```

## Limits and caveats

Set the `ORIGIN` variable to your public URL. Without it, form actions fail with a cross-site POST error.

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

See the [SvelteKit hub](/frameworks/sveltekit) for every SvelteKit guide, or [free SvelteKit hosting](/free-sveltekit-hosting) for what is included. To let an agent do this for you, read [deploy SvelteKit with Claude Code](/guides/deploy-sveltekit-with-claude-code).

## Frequently asked questions

### Is SvelteKit hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my SvelteKit app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for SvelteKit?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
