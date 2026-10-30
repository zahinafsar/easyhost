# Nuxt deploys, but the app is unreachable

If the build passes and the URL still fails, Nuxt is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

The Node server output reads `PORT` and `HOST` from the environment. Make sure `nitro.preset` is not set to another platform in `nuxt.config.ts`.

```package.json
{
  "scripts": {
    "build": "nuxt build"
  }
}
```

## Check the start command

Nuxt starts with `scripts.start`, or `node .output/server/index.mjs` when no start script exists.

```
npx ezhst build show
```

## Known cause for Nuxt

Use the default `node-server` preset. Presets for serverless platforms do not produce `.output/server/index.mjs`.

See the [Nuxt hub](/frameworks/nuxt) for every Nuxt guide, or [free Nuxt hosting](/free-nuxt-hosting) for what is included.
