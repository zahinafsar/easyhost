# Fastify deploys, but the app is unreachable

If the build passes and the URL still fails, Fastify is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

Fastify listens on `127.0.0.1` unless told otherwise. Call `app.listen({ port: Number(process.env.PORT), host: "0.0.0.0" })`.

```src/index.ts
import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/", async () => {
  return { hello: "EasyHost" };
});

await app.listen({ port: Number(process.env.PORT), host: "0.0.0.0" });
```

## Check the start command

Fastify starts with `scripts.start`, then `main`, `index.js` or `server.js`.

```
npx ezhst build show
```

## Known cause for Fastify

Forgetting `host` is the most common Fastify deploy failure: the build succeeds, but the app never receives traffic.

See the [Fastify hub](/frameworks/fastify) for every Fastify guide, or [free Fastify hosting](/free-fastify-hosting) for what is included.
