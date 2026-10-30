# Deploy Remix from a monorepo

Run the deploy from your repository root and tell EasyHost which folder holds your Remix app. It installs where the lockfile is and builds in your app folder.

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
| Build | `apps/web`, using `remix vite:build`, through your package build script |
| Start | `apps/web`, using `scripts.start`, usually `remix-serve ./build/server/index.js` |

## Build shared packages first

If Remix imports workspace packages that need compiling, build them first with a custom command.

```
npx ezhst build set --build "npx turbo run build --filter=./apps/web"
```

Nx works the same way with `npx nx build <project>`.

## Several apps, one project

A project holds up to five apps. Create one EasyHost app per deployable folder and set each root directory. They share the project's database, bucket and email sender.

See the [Remix hub](/frameworks/remix) for every Remix guide, or [free Remix hosting](/free-remix-hosting) for what is included.

## Frequently asked questions

### Where should I run ezhst deploy?

From the repository root, so shared packages and the lockfile are included in the upload.
