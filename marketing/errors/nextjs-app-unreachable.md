# Next.js deploys, but the app is unreachable

If the build passes and the URL still fails, Next.js is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

`next start` uses the `PORT` and `HOSTNAME` values EasyHost sets. If you wrote a custom server, pass both to `listen` yourself.

```package.json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

## Check the start command

Next.js starts with `scripts.start`, or `next start -H 0.0.0.0 -p $PORT` when no start script exists.

```
npx ezhst build show
```

## Known cause for Next.js

Middleware, image optimization and server actions run inside one container, in one region. There is no edge network.

See the [Next.js hub](/frameworks/nextjs) for every Next.js guide, or [free Next.js hosting](/free-nextjs-hosting) for what is included.
