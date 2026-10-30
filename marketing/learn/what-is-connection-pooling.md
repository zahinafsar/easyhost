# What is database connection pooling?

A connection pool keeps a small set of open database connections and shares them between requests.

## The short version

A connection pool keeps a small set of open database connections and shares them between requests. Opening a connection is slow, and databases allow only a limited number. Without a pool, or with one set too large, an app can run out of connections under load. Most apps need far fewer connections than developers expect.

## On EasyHost

Each EasyHost database allows 20 connections, so a pool of about 5 per app is a sensible start. [Learn more](/products/postgres).
