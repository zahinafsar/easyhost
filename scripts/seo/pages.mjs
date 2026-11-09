import { AGENTS, COMPETITORS, DNS_PROVIDERS, FRAMEWORKS, MANAGERS, ORMS, POSTGRES_SOURCES, PRODUCTS, S3_CLIENTS, SERVICE_ORM_PAGES, STORAGE_SOURCES } from "./data.mjs";
import { CLI_COMMANDS, CONCEPTS, ERRORS } from "./reference.mjs";
import { slugify } from "./markdown.mjs";

const HOME = { name: "EasyHost", path: "/" };
const GUIDES = { name: "Guides", path: "/guides" };
const FRAMEWORKS_HUB = { name: "Frameworks", path: "/frameworks" };
const MIGRATE = { name: "Migrate", path: "/migrate" };
const ALTERNATIVES = { name: "Alternatives", path: "/alternatives" };
const ERRORS_HUB = { name: "Errors", path: "/errors" };
const LEARN = { name: "Learn", path: "/learn" };
const CLI = { name: "CLI reference", path: "/docs/cli" };
const PRODUCTS_HUB = { name: "Products", path: "/products" };

const q = (text) => "`" + text + "`";
const fence = (code, label = "") => "```" + label + "\n" + code + "\n```";

const hostingPath = (framework) => {
  if (framework.existingHosting) {
    return framework.existingHosting;
  }
  return `/free-${framework.id}-hosting`;
};

const hubPath = (framework) => `/frameworks/${framework.id}`;

const makeRoute = (framework, { method, path, body, result, secret, imports = "" }) => {
  const route = framework.route;
  const lines = [];
  if (secret) {
    lines.push(`  if (${route.header("x-schedule-secret")} !== process.env.SCHEDULE_SECRET) {\n    ${route.deny}\n  }`);
  }
  if (body) {
    lines.push(`  ${body}`);
  }
  lines.push(`  ${route.reply(result)}`);
  const code = `${imports}${route.imports}${route.open(method, path)}\n${lines.join("\n")}\n${route.close}`;
  return { label: route.file(path, method), code };
};

const deploySteps = (framework) => {
  const lines = ["npx ezhst projects create my-project --link", "npx ezhst apps create my-app", "npx ezhst link --project <project-slug> --app <app-slug>"];
  for (const command of framework.commands) {
    lines.push(command.replace(/^ezhst/, "npx ezhst"));
  }
  lines.push("npx ezhst env import .env", "npx ezhst deploy");
  return lines.join("\n");
};

const frameworkLinks = (framework) => {
  return `See the [${framework.name} hub](${hubPath(framework)}) for every ${framework.name} guide, or [free ${framework.name} hosting](${hostingPath(framework)}) for what is included.`;
};

const hostingPages = (limits) => {
  return FRAMEWORKS.filter((framework) => !framework.existingHosting).map((framework) => {
    return {
      family: "hosting",
      path: hostingPath(framework),
      title: `Free ${framework.name} Hosting With Postgres and S3 | EasyHost`,
      description: `Host a ${framework.name} app for $0 on an always-on container, with Postgres, S3 storage, schedules and custom domains. No credit card. See the exact limits.`,
      h1: `Free ${framework.name} hosting`,
      lead: `EasyHost runs ${framework.name}, a ${framework.kind}, in an always-on Node.js container for $0. No credit card is needed, and your agent can deploy it with one instruction.`,
      crumbs: [HOME, FRAMEWORKS_HUB, { name: framework.name, path: hubPath(framework) }, { name: "Free hosting", path: hostingPath(framework) }],
      body: `## What you get

- An always-on container with 512 MB of RAM and 1 CPU
- A URL at ${q("<app-slug>.easyhost.fun")}, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- Up to ${limits.apps} apps and ${limits.schedules} schedules per project

## How ${framework.name} builds and runs

| Step | What EasyHost uses |
| --- | --- |
| Build | ${framework.build} |
| Start | ${framework.start} |
| Runtime env | ${q("NODE_ENV=production")}, ${q("PORT=3000")}, ${q("HOST=0.0.0.0")} |

${framework.setup}

${fence(framework.entry.code, framework.entry.label)}

## Deploy it

${fence(deploySteps(framework))}

## Limits and caveats

${framework.caveat}

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time.

## Next steps

${frameworkLinks(framework)} To let an agent do this for you, read [deploy ${framework.name} with Claude Code](/guides/deploy-${framework.id}-with-claude-code).`,
      faq: [
        { q: `Is ${framework.name} hosting on EasyHost really free?`, a: "Yes. It costs $0 per month with no credit card and no trial period, within the published limits." },
        { q: `Does my ${framework.name} app sleep when idle?`, a: "No. EasyHost apps run in an always-on container and do not sleep when idle." },
        { q: `Do I need a Dockerfile for ${framework.name}?`, a: "No. EasyHost builds an image from your source using the commands it detects or the ones you set." },
      ],
    };
  });
};

const agentPages = () => {
  const pages = [];
  for (const framework of FRAMEWORKS) {
    for (const agent of AGENTS) {
      const special = framework.commands.map((command) => `- ${q(command)}`).join("\n");
      let specialBlock = `${framework.name} needs no extra build settings, so the agent can run the standard deploy.`;
      if (special) {
        specialBlock = `The skill tells the agent to read the build log and fix failures. For ${framework.name}, expect it to run:\n\n${special}`;
      }
      pages.push({
        family: "agent-guides",
        path: `/guides/deploy-${framework.id}-with-${agent.id}`,
        title: `Deploy ${framework.name} With ${agent.name} for Free | EasyHost`,
        description: `Let ${agent.name} deploy your ${framework.name} app to EasyHost for free. Install the skill, give one instruction, and see each command the agent runs.`,
        h1: `Deploy ${framework.name} with ${agent.name}`,
        lead: `Install one skill, and ${agent.name} can create the project, set your variables and put your ${framework.name} app online. It costs $0, with no credit card.`,
        crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: agent.name, path: `/guides/deploy-${framework.id}-with-${agent.id}` }],
        body: `## Install the skill

Run this in your project and choose Local or Global.

${fence("npx ezhst skill install")}

${agent.hint}

If ${agent.name} does not discover the skill, ask it to read the installed ${q("SKILL.md")} or [skill.md](/skill.md) first.

## Tell ${agent.name} to deploy

${fence(`Deploy this ${framework.name} app to EasyHost. Read the EasyHost skill first. Report the live URL when it is running.`, "Prompt")}

## What the agent runs

${fence(deploySteps(framework))}

${specialBlock}

## ${framework.name} details to check

${framework.setup}

${framework.caveat}

## If the deploy fails

The agent should read the build log, fix the cause and deploy again. You can run the same commands yourself.

${fence("npx ezhst deployments log --json\nnpx ezhst logs --tail 200 --json")}

If the build passes but nothing loads, see [why a ${framework.name} app is unreachable](/errors/${framework.id}-app-unreachable). ${frameworkLinks(framework)}`,
        faq: [
          { q: `Can ${agent.name} create an EasyHost account for me?`, a: "Yes. The skill tells the agent to ask for your name, email and password and then register. You then give the agent the 6-digit verification code from your inbox, and it runs `ezhst verify <code>` before anything else." },
          { q: `Will ${agent.name} see my secrets?`, a: "The agent can read files and command output in its session. The skill tells it to put secrets in env vars and not to print them back unless you ask." },
        ],
      });
    }
  }
  return pages;
};

const managerPages = () => {
  const pages = [];
  for (const framework of FRAMEWORKS) {
    for (const manager of MANAGERS) {
      pages.push({
        family: "package-manager-guides",
        path: `/guides/deploy-${framework.id}-with-${manager.id}`,
        title: `Deploy a ${framework.name} App With ${manager.name} | EasyHost`,
        description: `How EasyHost installs and builds a ${framework.name} project that uses ${manager.name}: the lockfile it looks for, the exact commands, and common failures.`,
        h1: `Deploy a ${framework.name} app that uses ${manager.name}`,
        lead: `EasyHost picks ${manager.name} when it finds ${q(manager.lockfile)}. There is nothing to configure, and these are the exact commands it runs for ${framework.name}.`,
        crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: manager.name, path: `/guides/deploy-${framework.id}-with-${manager.id}` }],
        body: `## What EasyHost runs

| Step | Command |
| --- | --- |
| Lockfile | ${q(manager.lockfile)} |
| Install | ${q(manager.install)} |
| Build | ${framework.build} |
| Start | ${framework.start} |

Scripts run with ${q(`${manager.run} <script>`)}. Dev dependencies are available during the build, and the app runs with ${q("NODE_ENV=production")}.

## Deploy

${framework.setup}

${fence(deploySteps(framework))}

## Things to watch with ${manager.name}

${manager.note}

Commit ${q(manager.lockfile)}. Without any lockfile, EasyHost falls back to ${q("npm install")}. To replace the install step, run ${q('ezhst build set --install "<command>"')}.

## Next steps

${frameworkLinks(framework)}`,
        faq: [
          { q: `How do I change the ${manager.name} install command?`, a: "Run `ezhst build set --install \"<command>\"`, then `ezhst redeploy`. Pass an empty string to return to auto-detection." },
        ],
      });
    }
  }
  return pages;
};

const ormImports = (framework, orm) => {
  if (orm.importLine !== undefined) {
    return orm.importLine;
  }
  let names = "db";
  if (orm.extraImport) {
    names = `db, ${orm.extraImport}`;
  }
  return `import { ${names} } from "${framework.dbImport}";\n`;
};

const ormPage = (framework, orm, migrateNote) => {
  const result = orm.result ?? "users";
  const route = makeRoute(framework, { method: "GET", path: "/api/users", body: orm.body, result, imports: ormImports(framework, orm) });
  const path = `/guides/${framework.id}-${orm.id}-postgres`;
  let buildBlock = "";
  if (orm.build) {
    buildBlock = `\n\nGenerate the client during the build.\n\n${fence(orm.build)}`;
  }
  let bundlerBlock = "";
  if (framework.bundlerNote) {
    bundlerBlock = `\n\n${framework.bundlerNote}`;
  }
  return {
    family: "database-guides",
    path,
    title: `${framework.name} With ${orm.name} and Free Postgres | EasyHost`,
    description: `Connect ${framework.name} to a free Postgres 16 database using ${orm.name}: install, client setup, a working route, migrations and deployment on EasyHost.`,
    h1: `Use ${orm.name} with ${framework.name} and Postgres`,
    lead: `Connect a ${framework.name} app to a free EasyHost Postgres database using ${orm.name}, from install to deployment.`,
    crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: orm.name, path }],
    body: `## Create the database

${fence('npx ezhst db create main\nnpx ezhst db info --json\nnpx ezhst env set DATABASE_URL="postgresql://..."')}

The connection string uses a public host with TLS, so it works from your laptop too. Put it in your local ${q(".env")} for development.

## Install ${orm.name}

${fence(orm.install)}

## Create the client

${fence(orm.setup, framework.dbFile)}

${orm.note}${bundlerBlock}

## Query it from a route

${fence(route.code, route.label)}

## Run migrations

Run migrations from your machine, with ${q("DATABASE_URL")} set to the EasyHost connection string.

${fence(orm.migrate)}

${migrateNote}

## Deploy

${fence("npx ezhst deploy")}${buildBlock}

Each database allows 20 concurrent connections, and ${framework.name} shares them across requests. ${frameworkLinks(framework)} See also the [Postgres product page](/products/postgres).`,
    faq: [
      { q: `Is Postgres free for my ${framework.name} app?`, a: "Yes. Each EasyHost project can have one Postgres 16 database with no expiry date." },
      { q: `Can I use ${orm.name} locally against the same database?`, a: "Yes. The connection string works from outside EasyHost. A separate development database is safer once you have real data." },
    ],
  };
};

const databasePages = () => {
  const pages = [];
  for (const framework of FRAMEWORKS) {
    const own = SERVICE_ORM_PAGES[framework.id];
    if (own) {
      pages.push(ormPage(framework, { ...own, result: "rows" }, "This framework handles its own schema tooling, so keep these commands in your release routine."));
    } else {
      for (const orm of ORMS) {
        pages.push(ormPage(framework, orm, "Commit the migration files so every environment applies the same changes."));
      }
    }
  }
  return pages;
};

const storagePages = () => {
  const pages = [];
  for (const framework of FRAMEWORKS.filter((item) => !SERVICE_ORM_PAGES[item.id])) {
    for (const client of S3_CLIENTS) {
      const path = `/guides/${framework.id}-file-uploads-${client.id}`;
      const route = makeRoute(framework, {
        method: "POST",
        path: "/api/uploads",
        body: `const key = \`uploads/\${crypto.randomUUID()}\`;\n  ${client.body}`,
        result: `{ url, publicUrl: \`https://storage.easyhost.fun/\${process.env.S3_BUCKET}/\${key}\` }`,
        imports: `${client.imports}import { s3 } from "${framework.dbImport.replace(/db(\.server)?$/, "s3$1")}";\n`,
      });
      pages.push({
        family: "storage-guides",
        path,
        title: `${framework.name} File Uploads With the ${client.name} | EasyHost`,
        description: `Add file uploads to ${framework.name} using the ${client.name} and free S3 compatible storage. Includes a presigned upload route and the required settings.`,
        h1: `${framework.name} file uploads with the ${client.name}`,
        lead: `Let the browser upload straight to a free S3 compatible bucket, using a short-lived URL from your ${framework.name} server. Your 512 MB container never holds the file.`,
        crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: "File uploads", path }],
        body: `## Create the bucket

${fence("npx ezhst storage create files\nnpx ezhst storage info --json\nnpx ezhst env set S3_BUCKET=<bucket> S3_ACCESS_KEY_ID=<key> S3_SECRET_ACCESS_KEY=<secret>")}

> Every file in the bucket is public by URL. Do not use it for private documents.

## Create the client

${fence(client.install)}

${fence(client.setup, framework.dbFile.replace(/db(\.server)?\.ts$/, "s3$1.ts"))}

${client.note}

## Create the upload route

${fence(route.code, route.label)}

Add your own authentication and file type checks here, because anyone who can reach this route can upload.

## Upload from the browser

${fence('const { url, publicUrl } = await fetch("/api/uploads", { method: "POST" }).then((res) => res.json());\nawait fetch(url, { method: "PUT", body: file });')}

## Deploy

${fence("npx ezhst redeploy")}

Local disk is lost on each deploy, which is why uploads belong in the bucket. ${frameworkLinks(framework)} See also the [storage product page](/products/storage).`,
        faq: [
          { q: "Does the bucket support private files?", a: "No. Files are public by URL. Use long random keys only for low-risk content, and keep private data elsewhere." },
        ],
      });
    }
  }
  return pages;
};

const cronPages = () => {
  return FRAMEWORKS.map((framework) => {
    const path = `/guides/${framework.id}-cron-jobs`;
    const route = makeRoute(framework, { method: "POST", path: "/api/tasks", body: "", result: "{ ok: true }", secret: true });
    return {
      family: "schedule-guides",
      path,
      title: `Free Cron Jobs for ${framework.name} Apps | EasyHost`,
      description: `Run scheduled tasks in ${framework.name} without a cron server. Create a protected route and let EasyHost call it every 1 to 43200 minutes, for free.`,
      h1: `Cron jobs for ${framework.name}`,
      lead: `Put your scheduled task in a normal ${framework.name} route, protect it with a secret, and let EasyHost call it on an interval.`,
      crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: "Cron jobs", path }],
      body: `## Create a protected route

${fence(route.code, route.label)}

Set the secret, then deploy.

${fence("npx ezhst env set SCHEDULE_SECRET=<long-random-value>\nnpx ezhst deploy")}

## Create the schedule

This calls the route once a day.

${fence(`npx ezhst schedules create nightly \\
  --url https://<app-slug>.easyhost.fun/api/tasks \\
  --every 1440 \\
  --method POST \\
  --headers '{"x-schedule-secret":"<long-random-value>"}'`)}

## How schedules behave

- Requests time out after 30 seconds, so hand long work to a queue or split it up
- Redirects are not followed, so use the final URL
- Missed intervals are skipped after downtime, and calls to one schedule do not overlap
- A project can have five schedules, and the latest 100 runs are retained

${fence("npx ezhst schedules logs <id>")}

${frameworkLinks(framework)} See also the [schedules product page](/products/schedules).`,
      faq: [
        { q: "What is the shortest interval?", a: "One minute. The longest is 43200 minutes, which is 30 days." },
      ],
    };
  });
};

const envPages = () => {
  return FRAMEWORKS.map((framework) => {
    const path = `/guides/${framework.id}-environment-variables`;
    return {
      family: "env-guides",
      path,
      title: `${framework.name} Environment Variables in Production | EasyHost`,
      description: `How ${framework.name} reads environment variables on EasyHost: public and private values, build time and runtime, and importing your local .env file.`,
      h1: `${framework.name} environment variables in production`,
      lead: `${q(".env")} files are never uploaded to EasyHost. Here is how to set variables for ${framework.name}, and when each one takes effect.`,
      crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: "Environment variables", path }],
      body: `## How ${framework.name} reads variables

${framework.publicEnv}

## Set your variables

${fence(`npx ezhst env set ${framework.publicExample}\nnpx ezhst env import .env\nnpx ezhst env list\nnpx ezhst redeploy`)}

Variables apply on the next ${q("deploy")} or ${q("redeploy")}.

## What EasyHost provides

| Variable | Value | Available |
| --- | --- | --- |
| ${q("NODE_ENV")} | ${q("production")} | When the app runs, not during install or build |
| ${q("PORT")} | ${q("3000")} | Build and runtime |
| ${q("HOST")} | ${q("0.0.0.0")} | When the app runs |
| ${q("HOSTNAME")} | ${q("0.0.0.0")} | Build and runtime |

Your own variables are available in both the build and the running app.

## Common problems

- [Variable is undefined](/errors/env-missing-at-runtime) because it was only in a ${q(".env")} file
- [A public variable is undefined in the browser](/errors/public-env-undefined) because it changed after the build

${frameworkLinks(framework)}`,
      faq: [
        { q: "Are my .env files uploaded?", a: "No. `ezhst deploy` skips every `.env*` file. Use `ezhst env set` or `ezhst env import`." },
      ],
    };
  });
};

const monorepoPages = (limits) => {
  return FRAMEWORKS.map((framework) => {
    const path = `/guides/${framework.id}-monorepo`;
    return {
      family: "monorepo-guides",
      path,
      title: `Deploy ${framework.name} From a Monorepo | EasyHost`,
      description: `Deploy a ${framework.name} app from a Turborepo, Nx or workspace monorepo. Set one root directory, and EasyHost installs at the lockfile and builds your app.`,
      h1: `Deploy ${framework.name} from a monorepo`,
      lead: `Run the deploy from your repository root and tell EasyHost which folder holds your ${framework.name} app. It installs where the lockfile is and builds in your app folder.`,
      crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: "Monorepo", path }],
      body: `## Set the root directory

${fence(`npx ezhst link --project <project-slug> --app <app-slug>\nnpx ezhst build set --root-dir ${framework.appDir}\nnpx ezhst deploy`)}

## How it resolves

| Step | Where it runs |
| --- | --- |
| Upload | The folder where you ran ${q("deploy")}, so use the repository root |
| Install | Your app folder if it has a lockfile, otherwise the repository root |
| Build | ${q(framework.appDir)}, using ${framework.build} |
| Start | ${q(framework.appDir)}, using ${framework.start} |

## Build shared packages first

If ${framework.name} imports workspace packages that need compiling, build them first with a custom command.

${fence(`npx ezhst build set --build "npx turbo run build --filter=./${framework.appDir}"`)}

Nx works the same way with ${q("npx nx build <project>")}.

## Several apps, one project

A project holds up to ${limits.apps} apps. Create one EasyHost app per deployable folder and set each root directory. They share the project's database and bucket.

${frameworkLinks(framework)}`,
      faq: [
        { q: "Where should I run ezhst deploy?", a: "From the repository root, so shared packages and the lockfile are included in the upload." },
      ],
    };
  });
};

const unreachablePages = () => {
  return FRAMEWORKS.map((framework) => {
    const path = `/errors/${framework.id}-app-unreachable`;
    return {
      family: "errors",
      path,
      title: `${framework.name} Build Succeeds but App Is Unreachable | EasyHost`,
      description: `Your ${framework.name} deployment finished, but the URL does not load. Check the host and port binding, runtime logs and the most common ${framework.name} cause.`,
      h1: `${framework.name} deploys, but the app is unreachable`,
      lead: `If the build passes and the URL still fails, ${framework.name} is either not listening where the platform expects or it crashed while starting.`,
      crumbs: [HOME, ERRORS_HUB, { name: framework.name, path }],
      body: `## Check the logs

${fence("npx ezhst logs --tail 200")}

An exception here means the app crashed at boot. A missing variable is a common reason.

## Check host and port

${framework.bindingFix}

${fence(framework.entry.code, framework.entry.label)}

## Check the start command

${framework.name} starts with ${framework.start}.

${fence("npx ezhst build show")}

## Known cause for ${framework.name}

${framework.caveat}

${frameworkLinks(framework)}`,
      faq: [],
    };
  });
};

const dnsPages = () => {
  return DNS_PROVIDERS.map((provider) => {
    const path = `/guides/custom-domain-${provider.id}`;
    return {
      family: "domain-guides",
      path,
      title: `Connect a ${provider.name} Domain to Your App | EasyHost`,
      description: `Point a domain managed at ${provider.name} to your EasyHost app with free HTTPS. The exact records to create, where to find them, and how to verify.`,
      h1: `Connect a ${provider.name} domain to EasyHost`,
      lead: `Add one DNS record at ${provider.name}, verify it, and EasyHost issues the HTTPS certificate.`,
      crumbs: [HOME, GUIDES, { name: `${provider.name} domain`, path }],
      body: `## Add the domain to your app

${fence("npx ezhst domains add www.example.com\nnpx ezhst domains list")}

## Create the record at ${provider.name}

In ${provider.name}, open ${provider.path}.

| Domain | Type | Value |
| --- | --- | --- |
| Subdomain, like ${q("www.example.com")} | CNAME | ${q("<slug>.easyhost.fun")} |
| Root domain, like ${q("example.com")} | A | Server IP from ${q("ezhst domains list")} |

${provider.note}

## Verify

${fence("dig +short www.example.com\nnpx ezhst domains verify www.example.com")}

If verification fails, see [domain verification fails](/errors/domain-verify-failed). Also see the [custom domains product page](/products/custom-domains).`,
      faq: [
        { q: "How long does it take?", a: "Often minutes, but DNS changes can take longer to propagate, depending on the record's TTL. Run verify again if the first try fails." },
      ],
    };
  });
};

const comparisonPages = () => {
  return COMPETITORS.filter((competitor) => !competitor.existingAlternative).map((competitor) => {
    const path = `/${competitor.id}-alternative`;
    const rows = competitor.differences.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} |`).join("\n");
    return {
      family: "alternatives",
      path,
      title: `A Free ${competitor.name} Alternative for Node.js Apps | EasyHost`,
      description: `EasyHost compared with ${competitor.name} for hosting Node.js apps: free limits, runtime differences, what you lose by switching, and how to migrate.`,
      h1: `A free ${competitor.name} alternative for Node.js`,
      lead: `EasyHost is a smaller, free option for Node.js apps. Here are the honest differences from ${competitor.name}, including what you give up.`,
      crumbs: [HOME, ALTERNATIVES, { name: competitor.name, path }],
      body: `## How they compare

According to [${competitor.name}'s own page](${competitor.source}) as of October 2026, ${competitor.fact}. Check it for current details.

| Area | ${competitor.name} | EasyHost |
| --- | --- | --- |
${rows}
| Included with each app | Varies by plan | Postgres, S3 bucket and schedules per project |

## When EasyHost fits

- Side projects, prototypes and small apps written for Node.js
- Projects where an AI agent handles deployment through a CLI
- Apps that need to stay on for free

## When ${competitor.name} is the better choice

- You need multiple regions, autoscaling or a production support plan
- You want Git-based deploys or preview environments
- Your app goes beyond what 512 MB of RAM and 1 CPU can handle

## How to move

Read the [${competitor.name} migration guide](/migrate/${competitor.id}). If you have a database there, EasyHost's [Postgres](/products/postgres) accepts a normal ${q("pg_dump")}.`,
      faq: [
        { q: `Is EasyHost a full replacement for ${competitor.name}?`, a: "Not for every app. It runs Node.js only, in one region, with fixed limits. It suits small apps that fit those limits." },
      ],
    };
  });
};

const exportIsManual = (competitor) => competitor.envExport.startsWith("Copy") || competitor.envExport.includes("`");

const exportInstruction = (competitor) => {
  if (exportIsManual(competitor)) {
    return competitor.envExport;
  }
  return `Run ${q(competitor.envExport)}`;
};

const migrationHubPages = () => {
  return COMPETITORS.map((competitor) => {
    const path = `/migrate/${competitor.id}`;
    const links = FRAMEWORKS.map((framework) => `- [${framework.name}](/migrate/${competitor.id}/${framework.id})`).join("\n");
    return {
      family: "migration-guides",
      path,
      title: `Migrate From ${competitor.name} to EasyHost | EasyHost`,
      description: `Move a Node.js app from ${competitor.name} to EasyHost: export your variables, remove ${competitor.configFile}, deploy with the CLI, then switch DNS.`,
      h1: `Migrate from ${competitor.name} to EasyHost`,
      lead: `Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.`,
      crumbs: [HOME, MIGRATE, { name: competitor.name, path }],
      body: `## Steps

1. Export your variables. ${exportInstruction(competitor)}.
2. Remove or ignore ${q(competitor.configFile)}, because EasyHost does not read it.
3. Deploy with ${q("npx ezhst deploy")}, and test the ${q("easyhost.fun")} URL.
4. Move your data, then point your domain at EasyHost.

## What changes

${competitor.name} runs your app on ${competitor.runtime}. EasyHost runs one always-on Node.js container with 512 MB of RAM and 1 CPU, in one region.

## Choose your framework

${links}

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)`,
      faq: [],
    };
  });
};

const migrationPages = () => {
  const pages = [];
  for (const competitor of COMPETITORS) {
    for (const framework of FRAMEWORKS) {
      const path = `/migrate/${competitor.id}/${framework.id}`;
      let exportLine = `${fence(competitor.envExport)}`;
      if (exportIsManual(competitor)) {
        exportLine = `${competitor.envExport}.`;
      }
      pages.push({
        family: "migration-framework-guides",
        path,
        title: `Migrate ${framework.name} From ${competitor.name} | EasyHost`,
        description: `Move a ${framework.name} app from ${competitor.name} to EasyHost: export variables, change the adapter if needed, deploy, test and switch your domain.`,
        h1: `Migrate ${framework.name} from ${competitor.name} to EasyHost`,
        lead: `Move your ${framework.name} app in four steps, and keep ${competitor.name} running until the new deployment works.`,
        crumbs: [HOME, MIGRATE, { name: competitor.name, path: `/migrate/${competitor.id}` }, { name: framework.name, path }],
        body: `## Export your variables

${exportLine}

Then import them into EasyHost.

${fence("npx ezhst env import .env")}

## Change the ${framework.name} setup

${framework.adapterSwap}

${q(competitor.configFile)} is not read by EasyHost, so its build and routing rules need moving into your app or into build settings.

${framework.setup}

## Deploy and test

${fence(deploySteps(framework))}

Test your ${q("easyhost.fun")} URL before changing DNS. ${competitor.name} runs your app on ${competitor.runtime}, so check anything that depends on it, such as platform functions or cron configuration. Schedules move to [EasyHost schedules](/guides/${framework.id}-cron-jobs).

## Switch your domain

${fence("npx ezhst domains add www.example.com\nnpx ezhst domains list\nnpx ezhst domains verify www.example.com")}

Follow the [custom domain guides](/guides) for your DNS provider. Keep ${competitor.name} running until traffic has moved. Also read [why ${framework.name} may be unreachable](/errors/${framework.id}-app-unreachable) and the [${competitor.name} overview](/migrate/${competitor.id}).`,
        faq: [],
      });
    }
  }
  return pages;
};

const postgresMigrationPages = () => {
  const sources = POSTGRES_SOURCES.map((source) => {
    const path = `/migrate/postgres-from-${source.id}`;
    return {
      family: "migration-guides",
      path,
      title: `Move Postgres From ${source.name} to EasyHost | EasyHost`,
      description: `Copy a Postgres database from ${source.name} to free EasyHost Postgres with pg_dump and psql, including the right connection string and what to check.`,
      h1: `Move a Postgres database from ${source.name}`,
      lead: `Use the standard ${q("pg_dump")} and ${q("psql")} tools to copy your data into a free Postgres 16 database on EasyHost.`,
      crumbs: [HOME, MIGRATE, { name: "Postgres", path: "/migrate/postgres" }, { name: source.name, path }],
      body: `## Get both connection strings

For ${source.name}, use ${source.url}. ${source.note}

${fence("npx ezhst db create main\nnpx ezhst db info --json")}

## Copy the data

Use client tools at least as new as the source server. Run this during a quiet period so no writes are lost.

${fence('pg_dump --no-owner --no-acl --format=custom "$SOURCE_URL" -f backup.dump\npg_restore --no-owner --no-acl -d "$EASYHOST_URL" backup.dump')}

## Check and switch

${fence('npx ezhst db query "select count(*) from users"\nnpx ezhst env set DATABASE_URL="$EASYHOST_URL"\nnpx ezhst redeploy')}

Each database allows 20 connections and lives on a shared server, so check that your workload fits. Keep your own backups. See the [Postgres product page](/products/postgres).`,
      faq: [],
    };
  });
  const links = POSTGRES_SOURCES.map((source) => `- [${source.name}](/migrate/postgres-from-${source.id})`).join("\n");
  return [
    ...sources,
    {
      family: "migration-guides",
      path: "/migrate/postgres",
      title: "Migrate a Postgres Database to EasyHost | EasyHost",
      description: "Move a Postgres database to free EasyHost Postgres with pg_dump and pg_restore. Choose your current provider for the exact connection details.",
      h1: "Migrate a Postgres database to EasyHost",
      lead: "EasyHost runs standard Postgres 16, so ordinary dump and restore tools work.",
      crumbs: [HOME, MIGRATE, { name: "Postgres", path: "/migrate/postgres" }],
      body: `## Choose your provider\n\n${links}`,
      faq: [],
    },
  ];
};

const storageMigrationPages = () => {
  const sources = STORAGE_SOURCES.map((source) => {
    const path = `/migrate/storage-from-${source.id}`;
    let endpointLine = "";
    if (source.endpoint) {
      endpointLine = `\nendpoint = ${source.endpoint}`;
    }
    return {
      family: "migration-guides",
      path,
      title: `Move Files From ${source.name} to EasyHost | EasyHost`,
      description: `Copy files from ${source.name} to a free S3 compatible bucket on EasyHost using rclone, with the exact remote configuration and a public-files warning.`,
      h1: `Move files from ${source.name} to EasyHost`,
      lead: `Use rclone to copy a bucket from ${source.name} into EasyHost storage.`,
      crumbs: [HOME, MIGRATE, { name: "Storage", path: "/migrate/storage" }, { name: source.name, path }],
      body: `## Configure rclone

${fence(`[source]
type = s3
provider = ${source.provider}
access_key_id = <key>
secret_access_key = <secret>${endpointLine}

[easyhost]
type = s3
provider = Minio
endpoint = https://storage.easyhost.fun
region = us-east-1
force_path_style = true
access_key_id = <key>
secret_access_key = <secret>`, "rclone.conf")}

${source.note}

> Every file on EasyHost is public by URL. Do not copy private files.

## Copy

${fence("npx ezhst storage create files\nnpx ezhst storage info --json\nrclone copy source:my-bucket easyhost:<bucket> --progress")}

## Update your app

${fence("npx ezhst env set S3_ENDPOINT=https://storage.easyhost.fun S3_BUCKET=<bucket>\nnpx ezhst redeploy")}

Use path-style URLs in your client. See the [storage product page](/products/storage).`,
      faq: [],
    };
  });
  const links = STORAGE_SOURCES.map((source) => `- [${source.name}](/migrate/storage-from-${source.id})`).join("\n");
  return [
    ...sources,
    {
      family: "migration-guides",
      path: "/migrate/storage",
      title: "Migrate S3 Files to EasyHost Storage | EasyHost",
      description: "Copy files from another S3 compatible service to free EasyHost storage with rclone. Choose your current provider for the exact configuration.",
      h1: "Migrate S3 files to EasyHost",
      lead: "EasyHost storage speaks the S3 API, so rclone can copy your files directly.",
      crumbs: [HOME, MIGRATE, { name: "Storage", path: "/migrate/storage" }],
      body: `## Choose your provider\n\n${links}`,
      faq: [],
    },
  ];
};

const productPages = () => {
  return PRODUCTS.map((product) => {
    const path = `/products/${product.id}`;
    return {
      family: "products",
      path,
      title: `${product.title} | EasyHost`,
      description: product.summary.replaceAll("`", ""),
      h1: product.name,
      lead: product.summary,
      crumbs: [HOME, PRODUCTS_HUB, { name: product.name, path }],
      body: `## What you get

${product.points.map((point) => `- ${point}`).join("\n")}

## Try it

${product.tryIt ?? fence(product.commands)}

## Limits

${product.limits} See [pricing and limits](/pricing) for everything.

## Learn more

Read the [documentation](${product.docs}), or browse [guides by framework](/frameworks).`,
      faq: [],
    };
  });
};

const pricingPage = (limits) => {
  return {
    family: "products",
    path: "/pricing",
    title: "EasyHost Pricing: $0 With Published Limits",
    description: `EasyHost hosting is free with no credit card. See every limit: ${limits.projects} projects, ${limits.apps} apps per project, Postgres, S3 storage and schedules.`,
    h1: "Pricing and limits",
    lead: "Hosting on EasyHost costs $0 per month, with no credit card and no trial period. The only paid item is AI Tokens for the AI Builder, after your first free AI app and build.",
    crumbs: [HOME, { name: "Pricing", path: "/pricing" }],
    body: `## Limits

| Resource | Limit |
| --- | --- |
| Projects | ${limits.projects} |
| Apps | ${limits.apps} per project |
| Schedules | ${limits.schedules} per project |
| Storage buckets | 1 per project |
| Databases | 1 per project |
| Email | Coming soon |
| Project members | ${limits.projectMembers} per project, including pending invites |
| AI Builder prompts | ${limits.aiPromptsPerDay} per day, per project |
| Concurrent builds | ${limits.concurrentBuilds} |
| App container | 512 MB RAM, 1 CPU |

## AI Builder tokens

Each account gets its first AI app and its first build free. After that, AI requests use AI Tokens. Tokens are bought once and never expire.

| Pack | Price |
| --- | --- |
| 500 tokens | $5 |
| 1,100 tokens | $10 |
| 2,400 tokens | $20 |
| 6,500 tokens | $50 |

Each request is charged by how much work it takes, and a typical full build is a few hundred tokens. Hosting an AI app stays free. See the [AI Builder](/products/ai-builder).

## What it does not include

- Git integration or preview deployments
- An edge network or multiple regions
- Languages other than Node.js

## Compare

See how EasyHost differs from [other hosts](/alternatives), or browse [products](/products).`,
    faq: [
      { q: "Do I need a credit card?", a: "No. Hosting needs no card. You only pay if you buy AI Tokens for the AI Builder after your free AI app and build." },
      { q: "Is there a trial period?", a: "No. There is no expiry date on the free plan." },
    ],
  };
};

const commandPath = (command) => `/docs/cli/${slugify(command[1])}`;

const cliPages = () => {
  return CLI_COMMANDS.map((command) => {
    const [group, name, usage, summary, note] = command;
    const siblings = CLI_COMMANDS.filter((item) => item[0] === group && item[1] !== name)
      .map((item) => `- [${q(`ezhst ${item[1]}`)}](${commandPath(item)}): ${item[3]}`)
      .join("\n");
    let relatedBlock = "";
    if (siblings) {
      relatedBlock = `\n\n## Related commands\n\n${siblings}`;
    }
    return {
      family: "cli-reference",
      path: commandPath(command),
      title: `ezhst ${name} Command: CLI Reference | EasyHost`,
      description: `${summary} Usage, notes and JSON output for the ezhst ${name} command in the EasyHost CLI.`,
      h1: `ezhst ${name}`,
      lead: summary,
      crumbs: [HOME, CLI, { name, path: commandPath(command) }],
      body: `## Usage

${fence(usage)}

${note}

## In scripts and agents

Add ${q("--json")} to read the result from stdout. Progress goes to stderr. On failure the process exits with code 1 and prints ${q('{"error": "..."}')}. Without a TTY the CLI never prompts, so pass every value as a flag.

${fence(`npx ${usage.split(" <")[0].split(" [")[0]} --json`)}${relatedBlock}`,
      faq: [],
    };
  });
};

const errorTitle = (error) => {
  const full = `${error.title}: How to Fix It | EasyHost`;
  if (full.length <= 65) {
    return full;
  }
  return `${error.title} | EasyHost`;
};

const errorPages = () => {
  return ERRORS.map((error) => {
    const path = `/errors/${error.id}`;
    return {
      family: "errors",
      path,
      title: errorTitle(error),
      description: `${error.fix.replaceAll("`", "")} Why this error happens on deploy, and the commands that fix it.`,
      h1: error.title,
      lead: error.cause,
      crumbs: [HOME, ERRORS_HUB, { name: error.title, path }],
      body: `## The error

${fence(error.message)}

## Why it happens

${error.cause}

## How to fix it

${error.fix}

${fence(error.code)}

## Still stuck

Read the [build log](/docs/cli/deployments-log) and [runtime logs](/docs/cli/logs), or browse [all errors](/errors).`,
      faq: [],
    };
  });
};

const conceptDescription = (text) => {
  const sentence = `${text.split(". ")[0].replaceAll("`", "")}.`;
  if (sentence.length > 120) {
    return sentence;
  }
  return `${sentence} A short explanation for developers.`;
};

const conceptPages = () => {
  return CONCEPTS.map(([id, title, text, onEasyHost, link]) => {
    const path = `/learn/${id}`;
    return {
      family: "learn",
      path,
      title: `${title} | EasyHost`,
      description: conceptDescription(text),
      h1: title,
      lead: text.split(". ")[0] + ".",
      crumbs: [HOME, LEARN, { name: title, path }],
      body: `## The short version

${text}

## On EasyHost

${onEasyHost} [Learn more](${link}).`,
      faq: [],
    };
  });
};

const frameworkHubPages = () => {
  return FRAMEWORKS.map((framework) => {
    const own = SERVICE_ORM_PAGES[framework.id];
    let databases;
    if (own) {
      databases = `- [${own.name}](/guides/${framework.id}-${own.id}-postgres)`;
    } else {
      databases = ORMS.map((orm) => `- [${orm.name}](/guides/${framework.id}-${orm.id}-postgres)`).join("\n");
    }
    let storageBlock = "";
    if (!own) {
      const clients = S3_CLIENTS.map((client) => `- [${client.name}](/guides/${framework.id}-file-uploads-${client.id})`).join("\n");
      storageBlock = `## File uploads\n\n${clients}\n\n`;
    }
    const agents = AGENTS.map((agent) => `- [${agent.name}](/guides/deploy-${framework.id}-with-${agent.id})`).join("\n");
    const managers = MANAGERS.map((manager) => `- [${manager.name}](/guides/deploy-${framework.id}-with-${manager.id})`).join("\n");
    const migrations = COMPETITORS.map((competitor) => `- [From ${competitor.name}](/migrate/${competitor.id}/${framework.id})`).join("\n");
    return {
      family: "frameworks",
      path: hubPath(framework),
      title: `${framework.name} on EasyHost: Guides and Hosting`,
      description: `Everything for running ${framework.name} on EasyHost: free hosting, AI agent deploys, Postgres, file uploads, cron jobs and migration guides.`,
      h1: `${framework.name} on EasyHost`,
      lead: `${framework.name} is a ${framework.kind}. These guides cover hosting it for free and connecting it to Postgres, storage and schedules.`,
      crumbs: [HOME, FRAMEWORKS_HUB, { name: framework.name, path: hubPath(framework) }],
      body: `## Start here

- [Free ${framework.name} hosting](${hostingPath(framework)})
- [Environment variables](/guides/${framework.id}-environment-variables)
- [Deploy from a monorepo](/guides/${framework.id}-monorepo)
- [Fix an unreachable app](/errors/${framework.id}-app-unreachable)

## Deploy with an AI agent

${agents}

## Package managers

${managers}

## Postgres

${databases}

${storageBlock}## Schedules

- [Cron jobs](/guides/${framework.id}-cron-jobs)

## Migrate

${migrations}`,
      faq: [],
    };
  });
};

const indexPages = (pages) => {
  const listFamily = (family) => {
    return pages
      .filter((page) => page.family === family)
      .map((page) => `- [${page.h1}](${page.path})`)
      .join("\n");
  };
  const guideLinks = FRAMEWORKS.map((framework) => `- [${framework.name} guides](${hubPath(framework)})`).join("\n");
  const cliGroups = [...new Set(CLI_COMMANDS.map((command) => command[0]))]
    .map((group) => {
      const links = CLI_COMMANDS.filter((command) => command[0] === group)
        .map((command) => `- [${q(`ezhst ${command[1]}`)}](${commandPath(command)})`)
        .join("\n");
      return `## ${group}\n\n${links}`;
    })
    .join("\n\n");
  const hub = (path, title, description, h1, lead, body) => {
    return { family: "indexes", path, title, description, h1, lead, crumbs: [HOME, { name: h1, path }], body, faq: [] };
  };
  const competitorLinks = COMPETITORS.map((competitor) => {
    return `- [${competitor.name} alternative](${competitor.existingAlternative ?? `/${competitor.id}-alternative`})`;
  }).join("\n");
  const migrateLinks = COMPETITORS.map((competitor) => `- [From ${competitor.name}](/migrate/${competitor.id})`).join("\n");
  const productLinks = PRODUCTS.map((product) => `- [${product.name}](/products/${product.id})`).join("\n");
  return [
    hub("/frameworks", "Frameworks You Can Host for Free | EasyHost", "Free hosting and deployment guides for Next.js, Nuxt, Express, NestJS, Fastify, Hono, Koa, AdonisJS, Remix, SvelteKit, Astro and Strapi.", "Frameworks", "EasyHost runs any Node.js service. These frameworks have dedicated guides.", `## Choose a framework\n\n${guideLinks}`),
    hub("/guides", "EasyHost Guides: Deploy, Database, Storage and Cron Jobs", "Step by step guides for deploying Node.js apps on EasyHost, connecting Postgres and S3 storage, running cron jobs and adding custom domains.", "Guides", "Practical guides, grouped by framework.", `## By framework\n\n${guideLinks}\n\n## Custom domains\n\n${listFamily("domain-guides")}\n\n## Agents\n\n- [Deploy Next.js with AI agents](/guides/deploy-nextjs-with-ai-agents)`),
    hub("/errors", "Node.js Deployment Errors and Fixes | EasyHost", "Fixes for common Node.js deployment errors: lockfile failures, missing modules, memory limits, database connections, S3 signatures and domain verification.", "Deployment errors", "Find your error message, why it happens and the commands that fix it.", `## All errors\n\n${listFamily("errors")}`),
    hub("/learn", "Learn Hosting Concepts for Developers | EasyHost", "Short, plain explanations of hosting concepts for developers: object storage, connection pooling, migrations, DNS records, cold starts and more.", "Learn", "Short explanations of the hosting concepts that come up when you deploy an app.", `## Concepts\n\n${listFamily("learn")}`),
    hub("/migrate", "Migrate to EasyHost From Other Hosts | EasyHost", "Move a Node.js app to EasyHost from Vercel, Render, Railway, Netlify, Fly.io, Heroku or Koyeb, along with your Postgres database and S3 files.", "Migrate to EasyHost", "Guides for moving your app and data.", `## Move your app\n\n${migrateLinks}\n\n## Move your data\n\n- [Postgres](/migrate/postgres)\n- [S3 files](/migrate/storage)`),
    hub("/alternatives", "Free Alternatives to Popular Hosting Platforms | EasyHost", "Honest comparisons between EasyHost and Vercel, Render, Railway, Netlify, Fly.io, Heroku and Koyeb, including what you give up by switching.", "Alternatives", "Honest comparisons, including when the other platform is the better choice.", `## Compare\n\n${competitorLinks}`),
    hub("/docs/cli", "ezhst CLI Reference: Every Command | EasyHost", "Reference for every ezhst command: account, deploy, env, build, domains, storage, database, schedules and members, with usage and JSON output notes.", "CLI reference", "One page per `ezhst` command. The [main docs](/docs) cover the same commands on a single page.", cliGroups),
    hub("/products", "EasyHost Products: Hosting, Postgres, Storage, Schedules", "On EasyHost: free Node.js hosting, Postgres, S3 storage, schedules, custom domains, team members, a CLI, an agent skill and an AI app builder. Email is coming soon.", "Products", "Hosting is free within the [published limits](/pricing). The AI Builder uses AI Tokens after your first free AI app and build.", `## All products\n\n${productLinks}`),
  ];
};

export const buildPages = (limits) => {
  const pages = [
    ...productPages(),
    pricingPage(limits),
    ...hostingPages(limits),
    ...frameworkHubPages(),
    ...agentPages(),
    ...managerPages(),
    ...databasePages(),
    ...storagePages(),
    ...cronPages(),
    ...envPages(),
    ...monorepoPages(limits),
    ...dnsPages(),
    ...comparisonPages(),
    ...migrationHubPages(),
    ...migrationPages(),
    ...postgresMigrationPages(),
    ...storageMigrationPages(),
    ...cliPages(),
    ...errorPages(),
    ...unreachablePages(),
    ...conceptPages(),
  ];
  return [...pages, ...indexPages(pages)];
};
