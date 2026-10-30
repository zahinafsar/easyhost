# No start script or Node.js entry file found

EasyHost could not find `scripts.start`, Next.js, Nuxt, `main`, `index.js` or `server.js`.

## The error

```
No start script or Node.js entry file found. Add scripts.start to package.json or set a start command in Build settings.
```

## Why it happens

EasyHost could not find `scripts.start`, Next.js, Nuxt, `main`, `index.js` or `server.js`.

## How to fix it

Add a start script, or set the command explicitly. Compiled apps usually point at `dist`.

```
ezhst build set --start "node dist/index.js"
ezhst redeploy
```

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).
