# Strapi deploys, but the app is unreachable

If the build passes and the URL still fails, Strapi is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

Generated Strapi projects read `HOST` and `PORT` in `config/server.ts`, and EasyHost sets both. If Strapi exits at boot, a secret is probably missing.

```config/database.ts
export default ({ env }) => ({
  connection: {
    client: "postgres",
    connection: {
      connectionString: env("DATABASE_URL"),
    },
  },
});
```

## Check the start command

Strapi starts with `scripts.start`, which runs `strapi start`.

```
npx ezhst build show
```

## Known cause for Strapi

Strapi's admin build is memory hungry and apps run with 512 MB of RAM, so large projects may not fit. The default local upload provider also loses files on redeploy, so use the S3 provider.

See the [Strapi hub](/frameworks/strapi) for every Strapi guide, or [free Strapi hosting](/free-strapi-hosting) for what is included.
