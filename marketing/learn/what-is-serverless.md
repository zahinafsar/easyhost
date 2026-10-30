# Serverless vs always-on containers

Serverless functions start per request and scale automatically, but can have cold starts, time limits and no long-lived connections.

## The short version

Serverless functions start per request and scale automatically, but can have cold starts, time limits and no long-lived connections. An always-on container keeps one process running, so WebSockets, in-memory caches and background timers work normally, though it has fixed memory and does not scale by itself. Neither model is better for every app.

## On EasyHost

EasyHost runs one always-on container per app, with 512 MB of RAM. [Learn more](/products/app-hosting).
