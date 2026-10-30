# Remix deploys, but the app is unreachable

If the build passes and the URL still fails, Remix is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

`remix-serve` reads `PORT` and `HOST` from the environment. A custom Express server must pass both to `listen`.

```package.json
{
  "scripts": {
    "build": "remix vite:build",
    "start": "remix-serve ./build/server/index.js"
  }
}
```

## Check the start command

Remix starts with `scripts.start`, usually `remix-serve ./build/server/index.js`.

```
npx ezhst build show
```

## Known cause for Remix

Remove platform adapters such as `@vercel/remix` so your loaders run on the plain Node.js runtime.

See the [Remix hub](/frameworks/remix) for every Remix guide, or [free Remix hosting](/free-remix-hosting) for what is included.
