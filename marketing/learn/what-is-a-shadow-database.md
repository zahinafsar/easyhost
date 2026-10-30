# What is a Prisma shadow database?

A shadow database is a temporary database that `prisma migrate dev` uses to detect schema drift and check migrations.

## The short version

A shadow database is a temporary database that `prisma migrate dev` uses to detect schema drift and check migrations. Prisma normally creates and drops it automatically, which requires permission to create databases. On shared hosting that permission is usually missing, so you must provide a separate shadow database URL yourself.

## On EasyHost

Each EasyHost database includes one. Find it as `shadowConnectionString` in `ezhst db info --json`. [Learn more](/products/postgres).
