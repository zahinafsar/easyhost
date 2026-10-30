# Koa deploys, but the app is unreachable

If the build passes and the URL still fails, Koa is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

Call `app.listen(Number(process.env.PORT), "0.0.0.0")`.

```src/index.ts
import Koa from "koa";

const app = new Koa();

app.use((ctx) => {
  ctx.body = "Hello from EasyHost";
});

app.listen(Number(process.env.PORT), "0.0.0.0");
```

## Check the start command

Koa starts with `scripts.start`, then `main`, `index.js` or `server.js`.

```
npx ezhst build show
```

## Known cause for Koa

Koa ships without a router or body parser. Add `@koa/router` and `koa-bodyparser` for the examples on this site.

See the [Koa hub](/frameworks/koa) for every Koa guide, or [free Koa hosting](/free-koa-hosting) for what is included.
