# Free Express hosting

EasyHost runs Express, a minimal Node.js web framework, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.

## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at `<app-slug>.easyhost.fun`, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to 3 apps and 5 schedules per project

## How Express builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | your package build script if you have one, for example `tsc`; skipped otherwise |
| Start | `scripts.start`, then `main`, `index.js` or `server.js` |
| Runtime env | `NODE_ENV=production`, `PORT=3000`, `HOST=0.0.0.0` |

Listen on `process.env.PORT` and bind to `0.0.0.0`.

```src/index.ts
import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from EasyHost");
});

app.listen(Number(process.env.PORT), "0.0.0.0");
```

## Deploy it

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env import .env
npx ezhst deploy
```

## Limits and caveats

Files written to local disk disappear on the next deploy. Store uploads in the S3 bucket instead.

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

See the [Express hub](/frameworks/express) for every Express guide, or [free Express hosting](/free-express-hosting) for what is included. To let an agent do this for you, read [deploy Express with Claude Code](/guides/deploy-express-with-claude-code).

## Frequently asked questions

### Is Express hosting on EasyHost really free?

Yes. It costs $0 per month with no credit card and no trial period, within the published limits.

### Does my Express app sleep when idle?

No. EasyHost apps run in an always-on container and do not sleep when idle.

### Do I need a Dockerfile for Express?

No. EasyHost builds an image from your source using the commands it detects or the ones you set.
