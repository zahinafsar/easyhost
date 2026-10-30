# What is a database connection string?

A connection string is one URL holding everything a client needs to reach a database: username, password, host, port, database name and options such as `sslmode`.

## The short version

A connection string is one URL holding everything a client needs to reach a database: username, password, host, port, database name and options such as `sslmode`. Treat it as a secret, and keep it in an environment variable rather than in your code. Rotating the password changes the string, so every app using it needs the new value.

## On EasyHost

`ezhst db info --json` returns yours, and `ezhst db reset-password` rotates it. [Learn more](/products/postgres).
