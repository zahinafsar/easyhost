# NestJS deploys, but the app is unreachable

If the build passes and the URL still fails, NestJS is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

Call `app.listen(Number(process.env.PORT), "0.0.0.0")` in `src/main.ts`. The generated default of port 3000 happens to match, but do not rely on it.

```src/main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  await app.listen(Number(process.env.PORT), "0.0.0.0");
};

bootstrap();
```

## Check the start command

NestJS starts with `scripts.start`, which you should point at the compiled output.

```
npx ezhst build show
```

## Known cause for NestJS

The default `start` script runs `nest start`, which recompiles at boot. Use `node dist/main` so the 512 MB container is not spent on compiling.

See the [NestJS hub](/frameworks/nestjs) for every NestJS guide, or [free NestJS hosting](/free-nestjs-hosting) for what is included.
