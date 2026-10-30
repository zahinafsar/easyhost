# Scheduled API calls

Call any public HTTP or HTTPS URL on an interval from 1 minute to 30 days, with custom method, headers and body.

## What you get

- Up to five schedules per project
- Pause, resume, edit and delete at any time
- Latest 100 runs retained, with the latest 10 shown
- Calls to the same schedule do not overlap

## Try it

```
ezhst schedules create nightly --url https://my-app.easyhost.fun/api/tasks --every 1440 --method POST
ezhst schedules list
```

## Limits

30-second timeout, no redirects, and missed intervals are skipped. Execution can be delayed by about 10 seconds. See [pricing and limits](/pricing) for everything.

## Learn more

Read the [documentation](/docs#schedules), or browse [guides by framework](/frameworks).
