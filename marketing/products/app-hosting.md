# Node.js app hosting

Always-on Node.js containers with 512 MB of RAM and 1 CPU, built from your source with no Dockerfile.

## What you get

- Up to three apps per project, each on its own `<app-slug>.easyhost.fun` URL
- Node 20, 22 and 24, with npm, pnpm, yarn or bun picked from your lockfile
- Build and start commands detected automatically, and overridable
- HTTPS included, and runtime logs and build logs through the CLI

## Try it

```
ezhst apps create my-api
ezhst deploy
ezhst logs --tail 200
```

## Limits

One build at a time. One region. No preview deployments or Git integration. See [pricing and limits](/pricing) for everything.

## Learn more

Read the [documentation](/docs#deploying), or browse [guides by framework](/frameworks).
