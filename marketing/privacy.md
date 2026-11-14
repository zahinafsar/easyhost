# Privacy policy

EasyHost is a small hosting platform in beta. This page explains, in plain words, what we collect and how we handle what you store with us.

## What we collect

- Account details: your email address, a hashed password and whether your email is verified.
- Everything you upload or create: source code, build logs, environment variables, database contents, storage files, schedules and AI Builder chats and files.
- Usage data: deployments, builds, container logs, resource usage, IP addresses in server logs and AI Token purchases and usage.
- Dashboard analytics: the dashboard uses Microsoft Clarity to record how pages are used, so we can fix problems.

## Your data is not encrypted by us

Data travels over TLS (HTTPS and TLS for Postgres connections). Beyond that, EasyHost does not apply its own encryption to what you store. Environment variables, database rows, storage files, logs and source code are kept as you send them.

If something must stay private, even from us, encrypt it yourself before you store it, and keep the keys outside EasyHost.

Storage files are public to anyone with the URL. Do not put private files in a bucket unless you encrypt them first.

## We may look at your data

The people who run EasyHost can access your projects, apps, databases, files, logs and account. We may review them to:

- investigate security incidents, abuse, spam, phishing or malware
- check that use follows the [terms](/terms)
- fix bugs and support requests (including acting as your account with an admin session)
- respond to valid legal requests

We do not sell your data and we do not look at it for advertising.

## Services that process your data

- Google Cloud Build and Cloud Storage: your source code and build environment, to build your app images.
- Google Gemini: AI Builder prompts, files and logs, to generate your app.
- Lemon Squeezy: payment details when you buy AI Tokens. We never see your card number.
- Resend: your email address, to send verification, password reset and invite emails.
- Microsoft Clarity: dashboard usage recordings.

## How long we keep it

We keep your data while your account and projects exist. Deleting a project removes its apps, containers, images, database, bucket and files. Backups and logs may hold copies for a short time after that.

## Your choices

You can export your database and files at any time, and delete any project from the dashboard. To delete your account, email us from the address on the account.

## Changes

We may update this page. The date at the top shows the last change.

Questions about this page go to [hello@easyhost.fun](mailto:hello@easyhost.fun).
