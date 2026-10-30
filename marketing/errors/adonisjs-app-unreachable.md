# AdonisJS deploys, but the app is unreachable

If the build passes and the URL still fails, AdonisJS is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

AdonisJS reads `HOST` and `PORT` from the environment, and EasyHost sets both. If it exits at boot, `start/env.ts` is probably rejecting another missing variable.

```start/env.ts
export default await Env.create(new URL("../", import.meta.url), {
  NODE_ENV: Env.schema.enum(["development", "production", "test"] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: "host" }),
  APP_KEY: Env.schema.string(),
  LOG_LEVEL: Env.schema.string(),
});
```

## Check the start command

AdonisJS starts with `node build/bin/server.js`, set as the start command.

```
npx ezhst build show
```

## Known cause for AdonisJS

AdonisJS validates its environment at boot, so a missing `APP_KEY` stops the app before it listens. Check `ezhst logs`.

See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included.
