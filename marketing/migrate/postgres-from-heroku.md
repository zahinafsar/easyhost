# Move a Postgres database from Heroku

Use the standard `pg_dump` and `psql` tools to copy your data into a free Postgres 16 database on EasyHost.

## Get both connection strings

For Heroku, use `heroku config:get DATABASE_URL`. Put your app in maintenance mode first, so no new writes are lost: `heroku maintenance:on`.

```
npx ezhst db create main
npx ezhst db info --json
```

## Copy the data

Use client tools at least as new as the source server. Run this during a quiet period so no writes are lost.

```
pg_dump --no-owner --no-acl --format=custom "$SOURCE_URL" -f backup.dump
pg_restore --no-owner --no-acl -d "$EASYHOST_URL" backup.dump
```

## Check and switch

```
npx ezhst db query "select count(*) from users"
npx ezhst env set DATABASE_URL="$EASYHOST_URL"
npx ezhst redeploy
```

Each database allows 20 connections and lives on a shared server, so check that your workload fits. Keep your own backups. See the [Postgres product page](/products/postgres).
