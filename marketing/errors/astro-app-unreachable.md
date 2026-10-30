# Astro deploys, but the app is unreachable

If the build passes and the URL still fails, Astro is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

Standalone mode reads `HOST` and `PORT`, which EasyHost sets. If nothing answers, check that the adapter mode is `standalone`, not `middleware`.

```astro.config.mjs
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
});
```

## Check the start command

Astro starts with `node ./dist/server/entry.mjs`, set as the start command.

```
npx ezhst build show
```

## Known cause for Astro

A purely static Astro site has no Node server, so it needs the Node adapter or a small static file server to run here.

See the [Astro hub](/frameworks/astro) for every Astro guide, or [free Astro hosting](/free-astro-hosting) for what is included.
