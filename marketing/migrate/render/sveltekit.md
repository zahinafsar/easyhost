# Migrate SvelteKit from Render to EasyHost

Move your SvelteKit app in four steps, and keep Render running until the new deployment works.

## Export your variables

Copy variables from the Environment tab in the Render dashboard into a local `.env` file.

Then import them into EasyHost.

```
npx ezhst env import .env
```

## Change the SvelteKit setup

Replace `@sveltejs/adapter-vercel`, `adapter-netlify` or `adapter-auto` with `@sveltejs/adapter-node`.

`render.yaml` is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

Install `@sveltejs/adapter-node` and set it in `svelte.config.js`. The auto adapter is not enough.

## Deploy and test

```
npx ezhst projects create my-project --link
npx ezhst apps create my-app
npx ezhst link --project <project-slug> --app <app-slug>
npm i -D @sveltejs/adapter-node
npx ezhst build set --start "node build"
npx ezhst env import .env
npx ezhst deploy
```

Test your `easyhost.fun` URL before changing DNS. Render runs your app on long-running services, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/sveltekit-cron-jobs).

## Switch your domain

```
npx ezhst domains add www.example.com
npx ezhst domains list
npx ezhst domains verify www.example.com
```

Follow the [custom domain guides](/guides) for your DNS provider. Keep Render running until traffic has moved. Also read [why SvelteKit may be unreachable](/errors/sveltekit-app-unreachable) and the [Render overview](/migrate/render).
