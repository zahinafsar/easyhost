# Deploy Next.js from a monorepo

Run the deploy from your repository root and tell EasyHost which folder holds your Next.js app. It installs where the lockfile is and builds in your app folder.

## Set the root directory

```
npx ezhst link --project <project-slug> --app <app-slug>
npx ezhst build set --root-dir apps/web
npx ezhst deploy
```

## How it resolves

| Step | Where it runs |
| --- | --- |
| Upload | The folder where you ran `deploy`, so use the repository root |
| Install | Your app folder if it has a lockfile, otherwise the repository root |
| Build | `apps/web`, using `next build`, through your package build script |
| Start | `apps/web`, using `scripts.start`, or `next start -H 0.0.0.0 -p $PORT` when no start script exists |

## Build shared packages first

If Next.js imports workspace packages that need compiling, build them first with a custom command.

```
npx ezhst build set --build "npx turbo run build --filter=./apps/web"
```

Nx works the same way with `npx nx build <project>`.

## Several apps, one project

A project holds up to five apps. Create one EasyHost app per deployable folder and set each root directory. They share the project's database, bucket and email sender.

See the [Next.js hub](/frameworks/nextjs) for every Next.js guide, or [free Next.js hosting](/free-nextjs-hosting) for what is included.

## Frequently asked questions

### Where should I run ezhst deploy?

From the repository root, so shared packages and the lockfile are included in the upload.
