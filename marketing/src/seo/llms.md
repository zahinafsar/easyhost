# Reverhost

> Reverhost is free hosting for apps in any language, built from a Dockerfile, including Next.js and other Node.js frameworks, with managed Postgres, S3 compatible storage and custom domains. Everything is operated through the `ezhst` CLI, which is built to be driven by AI coding agents (Claude Code, Cursor, Codex). Hosting costs $0 per month and needs no credit card. Reverhost is in beta.

Key facts:

- Each app runs in an always-on container (256 MB RAM with no swap, 0.5 CPU) built from a Dockerfile stored on the app. Apps do not sleep when idle and must listen on 0.0.0.0 and `$PORT` (3000).
- A Dockerfile in the repository is not used automatically: edit it in the dashboard Build tab or upload it with `ezhst build dockerfile set -f Dockerfile`. `ezhst build dockerfile template <id>` prints a starter (`--apply` saves it). Templates cover Node.js (Express, Fastify, Hono, NestJS, Next.js, Nuxt, SvelteKit, React Router, Astro), Bun, Python (FastAPI, Flask, Django, Streamlit), Ruby (Rails, Rack), PHP (Laravel), Go, Rust, Zig and static sites; run it without an id to list them. `ezhst deploy` fails fast when the app has no Dockerfile, and `ezhst redeploy` rebuilds the latest upload, even a failed one.
- Env vars are runtime env in the container. For build-time access, a `RUN` step mounts them: `RUN --mount=type=secret,id=appenv,target=/run/secrets/appenv sh -c 'set -a; . /run/secrets/appenv; set +a; <build command>'`. Never use ARG or ENV for secrets.
- Free plan: 3 projects per account. Per project: 2 apps (your own apps and AI Builder apps share this limit), one Postgres 16 database (128 MB), one storage bucket (256 MB), 10 team members (including pending invites), 30 AI Builder prompts per day. One build at a time per app, 10 builds per day per account owner (50 on Pro), images up to 1 GB.
- Sign-up needs email verification with a 6-digit code: after `ezhst register`, run `ezhst verify <code>` with the code from your inbox before any other command. `ezhst resend-verification` emails a new code (60 second cooldown, codes expire after 10 minutes).
- Projects can be shared: the owner invites people by email (`ezhst members invite <email>`), and members manage everything except inviting, removing, renaming or deleting.
- The AI Builder in the dashboard builds an app from a description: it asks a few questions, shows a plan, offers 9 themes, then writes a plain JavaScript Hono app that runs at `https://<name>.easyhost.fun` and uses the project's Postgres and storage. You can select an element in the preview to tag it in your message, attach up to 5 images per message (used only as assets at `/uploads/<name>`; the AI cannot see, edit or generate images), edit the code directly in the Code view and export the app as a zip. It is not part of the CLI. Each account gets its first AI app and first build free; after that, AI requests use AI tokens, charged by how much work each request takes (a typical full build is a few hundred tokens).
- Pro costs $10 a month: 10 projects (same per-project limits) and the AI token balance topped up to 500 every month. Upgrade on the Subscription page or with `ezhst billing upgrade`.
- Any language works: Node.js, Bun, Python, Go, Ruby, PHP, Rust, Zig or anything else you can write a Dockerfile for. Node.js framework guides cover Next.js, Nuxt, Express, NestJS, Fastify, Hono, Koa, AdonisJS, Remix, SvelteKit, Astro and Strapi; adapter-based frameworks need their Node adapter.
- Apps are served from one region at `https://<project>.easyhost.fun`, with custom domains and automatic HTTPS.
- There is no Git integration, no preview deployments and no edge network.
- Install the agent skill with `npx ezhst skill install` and choose the agent (Claude Code, Codex or Cursor), then Global or Local. Claude Code uses `.claude/skills`, Codex uses `.agents/skills`, Cursor uses `.cursor/skills` (under `~` for Global, the current directory for Local). For noninteractive use, including `--json`, pass `--agent <claude|codex|cursor>` and exactly one of `--global` or `--local`.
- Ask the agent to "Deploy this to Reverhost". If it does not discover the skill, ask it to read the installed `SKILL.md` or https://reverhost.com/skill.md first.

## Docs

- [Agent skill](https://reverhost.com/skill.md): Complete instructions for an agent using the ezhst CLI
- [CLI reference](https://reverhost.com/docs): Every command for accounts, deploys, env vars, Dockerfiles and build settings, logs, domains, storage, Postgres and team members
- [Deploy with an AI agent](https://reverhost.com/guides/deploy-nextjs-with-ai-agents): Step by step guide for Claude Code, Cursor and Codex

## Product

- [Free Next.js hosting](https://reverhost.com/free-nextjs-hosting): What the free plan includes and how apps run
- [Free Postgres hosting](https://reverhost.com/free-postgres-hosting): The included Postgres database
- [AI Builder](https://reverhost.com/products/ai-builder): Build an app from a description in the dashboard
- [Vercel alternative](https://reverhost.com/vercel-alternative): Differences between Reverhost and Vercel Hobby
