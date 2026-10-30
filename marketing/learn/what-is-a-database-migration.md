# What is a database migration?

A migration is a versioned change to your database schema, stored in your repository alongside your code.

## The short version

A migration is a versioned change to your database schema, stored in your repository alongside your code. Running migrations in order brings any database to the current shape, so development and production stay consistent. Production should only apply committed migrations, and generating new ones belongs in development.

## On EasyHost

Run migrations from your machine against the connection string, for example with `prisma migrate deploy`. [Learn more](/products/postgres).
