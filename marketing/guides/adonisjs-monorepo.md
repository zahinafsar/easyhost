# Deploy AdonisJS from a monorepo

Run the deploy from your repository root and tell EasyHost which folder holds your AdonisJS app. It installs where the lockfile is and builds in your app folder.

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
| Build | `apps/api`, using `node ace build`, set as the build command |
| Start | `apps/api`, using `node build/bin/server.js`, set as the start command |

## Build shared packages first

If AdonisJS imports workspace packages that need compiling, build them first with a custom command.

```
npx ezhst build set --build "npx turbo run build --filter=./apps/api"
```

Nx works the same way with `npx nx build <project>`.

## Several apps, one project

A project holds up to 3 apps. Create one EasyHost app per deployable folder and set each root directory. They share the project's database and bucket.

See the [AdonisJS hub](/frameworks/adonisjs) for every AdonisJS guide, or [free AdonisJS hosting](/free-adonisjs-hosting) for what is included.

## Frequently asked questions

### Where should I run ezhst deploy?

From the repository root, so shared packages and the lockfile are included in the upload.
