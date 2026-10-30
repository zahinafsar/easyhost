# Email service temporarily paused

The email provider's shared quota or rate limit was reached. The API returns HTTP 503. This is not caused by your project's daily limit.

## The error

```
Serice temprarily paused due to over usage
```

## Why it happens

The email provider's shared quota or rate limit was reached. The API returns HTTP 503. This is not caused by your project's daily limit.

## How to fix it

Retry later, and queue important email so it can be sent again.

```
ezhst email logs
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
