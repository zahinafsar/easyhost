# Migrate Strapi from Fly.io to EasyHost

Move your Strapi app in four steps, and keep Fly.io running until the new deployment works.

## Export your variables

`fly secrets list` shows only digests, so copy values from your own records into a local `.env` file.

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the Strapi setup

No adapter is needed. Move from SQLite to Postgres and switch uploads to an S3 provider.

`fly.toml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Use Postgres rather than SQLite, and set Strapi's secret variables before the first deploy.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst env set APP_KEYS=<a>,<b> API_TOKEN_SALT=<salt> ADMIN_JWT_SECRET=<secret> TRANSFER_TOKEN_SALT=<salt> JWT_SECRET=<secret>
npx ezhst env set DATABASE_CLIENT=postgres DATABASE_URL=<connection string>
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Fly.io runs your app on Machines you can place in many regions, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/strapi-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Fly.io running until traffic has moved. Also read [why Strapi may be unreachable](/errors/strapi-app-unreachable) and the [Fly.io overview](/migrate/fly).
