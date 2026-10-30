# Cron jobs for AdonisJS

Put your scheduled task in a normal AdonisJS route, protect it with a secret, and let EasyHost call it on an interval.

## Create a protected route

```start/routes.ts
import router from "@adonisjs/core/services/router";
router.post("/api/tasks", async ({ request, response }) => {
  if (request.header("x-schedule-secret") !== process.env.SCHEDULE_SECRET) {
    return response.unauthorized("Unauthorized");
  }
  return { ok: true };
});
```

Set the secret, then deploy.

```
npx ezhst env set SCHEDULE_SECRET=<long-random-value>
npx ezhst deploy
```

## Create the schedule

This calls the route once a day.

```
npx ezhst schedules create nightly \
  --url https://<app-slug>.easyhost.fun/api/tasks \
  --every 1440 \
  --method POST \
  --headers '{"x-schedule-secret":"<long-random-value>"}'
```

## How schedules behave

- Requests time out after 30 seconds, so hand long work to a queue or split it up
- Redirects are not followed, so use the final URL
- Missed intervals are skipped after downtime, and calls to one schedule do not overlap
- A project can have five schedules, and the latest 100 runs are retained

```
npx ezhst schedules logs <id>
```

See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included. See also the [schedules product page](/products/schedules).

## Frequently asked questions

### What is the shortest interval?

One minute. The longest is 43200 minutes, which is 30 days.
