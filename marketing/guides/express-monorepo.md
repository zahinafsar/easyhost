# Deploy Express from a monorepo

Run the deploy from your repository root and tell EasyHost which folder holds your Express app. It installs where the lockfile is and builds in your app folder.

## Set the root directory

```
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --root-dir apps/api
npx ezhst deploy
```

## How it resolves

| Step | Where it runs |
| --- | --- |
| Upload | The folder where you ran `deploy`, so use the repository root |
| Install | Your app folder if it has a lockfile, otherwise the repository root |
| Build | `apps/api`, using your package build script if you have one, for example `tsc`; skipped otherwise |
| Start | `apps/api`, using `scripts.start`, then `main`, `index.js` or `server.js` |

## Build shared packages first

If Express imports workspace packages that need compiling, build them first with a custom command.

```
npx ezhst build set --build "npx turbo run build --filter=./apps/api"
```

Nx works the same way with `npx nx build <project>`.

## Several apps, one project

A project holds up to 3 apps. Create one EasyHost app per deployable folder and set each root directory. They share the project's database and bucket.

See the [Express hub](/frameworks/express) for every Express guide, or [free Express hosting](/free-express-hosting) for what is included.

## Frequently asked questions

### Where should I run ezhst deploy?

From the repository root, so shared packages and the lockfile are included in the upload.
