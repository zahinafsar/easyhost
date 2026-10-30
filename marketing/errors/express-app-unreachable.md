# Express deploys, but the app is unreachable

If the build passes and the URL still fails, Express is either not listening where the platform expects or it crashed while starting.

## Check the logs

```
npx ezhst logs --tail 200
```

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

Call `app.listen(Number(process.env.PORT), "0.0.0.0")`. A hard-coded port such as 8080 will not receive traffic.

```src/index.ts
import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from EasyHost");
});

app.listen(Number(process.env.PORT), "0.0.0.0");
```

## Check the start command

Express starts with `scripts.start`, then `main`, `index.js` or `server.js`.

```
npx ezhst build show
```

## Known cause for Express

Files written to local disk disappear on the next deploy. Store uploads in the S3 bucket instead.

See the [Express hub](/frameworks/express) for every Express guide, or [free Express hosting](/free-express-hosting) for what is included.
