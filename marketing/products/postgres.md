# Postgres database

One Postgres 16 database per project, with TLS, a public connection string and a shadow database for Prisma.

## What you get

- Standard connection string that works with any client or ORM
- Reachable from your laptop, CI and other hosts
- `prisma migrate dev` works through the included shadow database
- Run SQL from the CLI with `ezhst db query`

## Try it

```
ezhst db create main
ezhst db info --json
ezhst db query "select now()"
```

## Limits

One database per project and 20 concurrent connections. Shared server in one region. Keep your own backups. See [pricing and limits](/pricing) for everything.

## Learn more

Read the [documentation](/docs#database), or browse [guides by framework](/frameworks).
