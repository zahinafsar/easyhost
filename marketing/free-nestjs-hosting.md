# Free NestJS hosting

EasyHost runs NestJS, a structured Node.js backend framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to 3 apps and 5 schedules per project

## How NestJS builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | `nest build`, through your package build script |
| Start | `scripts.start`, which you should point at the compiled output |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Run the compiled app with `node dist/main` and listen on `process.env.PORT`.

```src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT), "0.0.0.0");
};

bootstrap();
```

## Deploy it

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --start "node dist/main"
npx ezhst env import .env
npx ezhst deploy
```

## Limits and caveats

The default `start` script runs `nest start`, which recompiles at boot. Use `node dist/main` so the 512 MB container is not spent on compiling.

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

See the [NestJS hub](/frameworks/nestjs) for every NestJS guide, or [free NestJS hosting](/free-nestjs-hosting) for what is included. To let an agent do this for you, read [deploy NestJS with Claude Code](/guides/deploy-nestjs-with-claude-code).

## Frequently asked questions

### Is NestJS hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my NestJS app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for NestJS?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
