# SvelteKit deploys, but the app is unreachable

If the build passes and the URL still fails, SvelteKit is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

The Node adapter reads `PORT` and `HOST`, which EasyHost sets. If nothing answers, check that `svelte.config.js` uses `@sveltejs/adapter-node`.

```svelte.config.js
import adapter from "@sveltejs/adapter-node";

export default {
  kit: {
    adapter: adapter(),
  },
};
```

## Check the start command

SvelteKit starts with `node build`, set as the start command or as `scripts.start`.

```
npx ezhst build show
```

## Known cause for SvelteKit

Set the `ORIGIN` variable to your public URL. Without it, form actions fail with a cross-site POST error.

See the [SvelteKit hub](/frameworks/sveltekit) for every SvelteKit guide, or [free SvelteKit hosting](/free-sveltekit-hosting) for what is included.
