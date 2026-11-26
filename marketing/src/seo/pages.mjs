import { buildStep, COMPETITORS, DNS_PROVIDERS, FRAMEWORKS, LANGUAGES, nodeDockerfile, ORMS, POSTGRES_SOURCES, PRODUCTS, SERVICE_ORM_PAGES, STACKS, STORAGE_SOURCES } from "./data.mjs";
import { CLI_COMMANDS, ERRORS } from "./reference.mjs";
import { slugify } from "./markdown.mjs";

const HOME = { name: "Reverhost", path: "/" };
const GUIDES = { name: "Guides", path: "/guides" };
const FRAMEWORKS_HUB = { name: "Frameworks", path: "/frameworks" };
const MIGRATE = { name: "Migrate", path: "/migrate" };
const LANGUAGES_HUB = { name: "Languages", path: "/languages" };
const ALTERNATIVES = { name: "Alternatives", path: "/alternatives" };
const ERRORS_HUB = { name: "Errors", path: "/errors" };
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

const makeRoute = (framework, { method, path, body, result, imports = "" }) => {
  const route = framework.route;
  const lines = [];
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
  lines.push("npx ezhst build dockerfile set -f Dockerfile", "npx ezhst env import .env", "npx ezhst deploy");
  return lines.join("\n");
};

const frameworkDockerfile = (framework) => fence(nodeDockerfile(framework.docker), "Dockerfile");

const frameworkLinks = (framework) => {
  return `See the [${framework.name} hub](${hubPath(framework)}) for every ${framework.name} guide, or [free ${framework.name} hosting](${hostingPath(framework)}) for what is included.`;
};

const hostingPages = (limits) => {
  return FRAMEWORKS.filter((framework) => !framework.existingHosting).map((framework) => {
    return {
      family: "hosting",
      path: hostingPath(framework),
      title: `Free ${framework.name} Hosting With Postgres and S3 | Reverhost`,
      description: `Host a ${framework.name} app for $0 on an always-on container, with Postgres, S3 storage and custom domains. No credit card. See the exact limits.`,
      h1: `Free ${framework.name} hosting`,
      lead: `Reverhost runs ${framework.name}, a ${framework.kind}, in an always-on container built from your Dockerfile, for $0. No credit card is needed, and your agent can deploy it with one instruction.`,
      crumbs: [HOME, FRAMEWORKS_HUB, { name: framework.name, path: hubPath(framework) }, { name: "Free hosting", path: hostingPath(framework) }],
      body: `## What you get

- An always-on container with ${limits.appMemoryMb} MB of RAM and ${limits.appCpus} CPU
- A URL at ${q("<app-slug>.easyhost.fun")}, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- ${limits.apps} apps per project, with a ${limits.dbMb} MB database and ${limits.storageMb} MB of storage

## How ${framework.name} builds and runs

Every app builds from a Dockerfile stored on the app. For ${framework.name}, start from the Node.js template (${q("ezhst build dockerfile template node")}) and adjust it.

| Step | What your Dockerfile runs |
| --- | --- |
| Build | ${framework.build} |
| Start | ${framework.start} |
| Runtime env | ${q("PORT=3000")} and ${q("HOSTNAME=0.0.0.0")} from Reverhost, ${q("NODE_ENV=production")} from the Dockerfile |

${framework.setup}

${fence(framework.entry.code, framework.entry.label)}

## The Dockerfile

${frameworkDockerfile(framework)}

The build step mounts your variables as a secret, so they are available while ${framework.name} builds without ending up in the image.

## Deploy it

Save the Dockerfile in your project folder, then run:

${fence(deploySteps(framework))}

## Limits and caveats

${framework.caveat}

Apps run in one region, with no edge network, preview deployments or Git integration. One build runs at a time per app, with up to ${limits.buildsPerDay} builds a day on the free plan.

## Next steps

${frameworkLinks(framework)} To let an agent do this for you, read [deploy with AI agents](/guides/deploy-nextjs-with-ai-agents).`,
      faq: [
        { q: `Is ${framework.name} hosting on Reverhost really free?`, a: "Yes. It costs $0 per month with no credit card and no trial period, within the published limits." },
        { q: `Does my ${framework.name} app sleep when idle?`, a: "No. Reverhost apps run in an always-on container and do not sleep when idle." },
        { q: `Do I need a Dockerfile for ${framework.name}?`, a: "Yes. Every app builds from a Dockerfile stored on the app. Start from `ezhst build dockerfile template node`, adjust the build and start lines, and upload it with `ezhst build dockerfile set -f Dockerfile`. A Dockerfile in your repository is not used until you upload it." },
      ],
    };
  });
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
    buildBlock = `\n\nGenerate the client in your Dockerfile build step, then upload the Dockerfile again with ${q("ezhst build dockerfile set -f Dockerfile")}.\n\n${fence(buildStep(orm.build), "Dockerfile")}`;
  }
  let bundlerBlock = "";
  if (framework.bundlerNote) {
    bundlerBlock = `\n\n${framework.bundlerNote}`;
  }
  return {
    family: "database-guides",
    path,
    title: `${framework.name} With ${orm.name} and Free Postgres | Reverhost`,
    description: `Connect ${framework.name} to a free Postgres 16 database using ${orm.name}: install, client setup, a working route, migrations and deployment on Reverhost.`,
    h1: `Use ${orm.name} with ${framework.name} and Postgres`,
    lead: `Connect a ${framework.name} app to a free Reverhost Postgres database using ${orm.name}, from install to deployment.`,
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

Run migrations from your machine, with ${q("DATABASE_URL")} set to the Reverhost connection string.

${fence(orm.migrate)}

${migrateNote}

## Deploy

${fence("npx ezhst deploy")}${buildBlock}

Each database allows 20 concurrent connections, and ${framework.name} shares them across requests. ${frameworkLinks(framework)} See also the [Postgres product page](/products/postgres).`,
    faq: [
      { q: `Is Postgres free for my ${framework.name} app?`, a: "Yes. Each Reverhost project can have one Postgres 16 database with no expiry date." },
      { q: `Can I use ${orm.name} locally against the same database?`, a: "Yes. The connection string works from outside Reverhost. A separate development database is safer once you have real data." },
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

const envPages = () => {
  return FRAMEWORKS.map((framework) => {
    const path = `/guides/${framework.id}-environment-variables`;
    return {
      family: "env-guides",
      path,
      title: `${framework.name} Environment Variables in Production | Reverhost`,
      description: `How ${framework.name} reads environment variables on Reverhost: public and private values, build time and runtime, and importing your local .env file.`,
      h1: `${framework.name} environment variables in production`,
      lead: `${q(".env")} files are never uploaded to Reverhost. Here is how to set variables for ${framework.name}, and when each one takes effect.`,
      crumbs: [HOME, GUIDES, { name: framework.name, path: hubPath(framework) }, { name: "Environment variables", path }],
      body: `## How ${framework.name} reads variables

${framework.publicEnv}

## Set your variables

${fence(`npx ezhst env set ${framework.publicExample}\nnpx ezhst env import .env\nnpx ezhst env list\nnpx ezhst redeploy`)}

Variables apply on the next ${q("deploy")} or ${q("redeploy")}.

## What Reverhost provides

| Variable | Value | Available |
| --- | --- | --- |
| ${q("PORT")} | ${q("3000")} | Build step and runtime |
| ${q("HOSTNAME")} | ${q("0.0.0.0")} | When the app runs |

${q("NODE_ENV=production")} comes from the ${q("ENV")} line in the Node.js Dockerfile template, and ${q("HOST")} is set only if your Dockerfile sets it.

Your own variables are runtime env in the container. During the build they exist only in a ${q("RUN")} step that mounts the ${q("appenv")} secret, like the build step in the template:

${fence(buildStep("npm run build"), "Dockerfile")}

Never pass secrets with ${q("ARG")} or ${q("ENV")}, because they end up in the image.

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

const unreachablePages = () => {
  return FRAMEWORKS.map((framework) => {
    const path = `/errors/${framework.id}-app-unreachable`;
    return {
      family: "errors",
      path,
      title: `${framework.name} Build Succeeds but App Is Unreachable | Reverhost`,
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

${framework.name} starts with ${framework.start}, from the ${q("CMD")} line of your Dockerfile.

${fence("npx ezhst build dockerfile show")}

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
      title: `Connect a ${provider.name} Domain to Your App | Reverhost`,
      description: `Point a domain managed at ${provider.name} to your Reverhost app with free HTTPS. The exact records to create, where to find them, and how to verify.`,
      h1: `Connect a ${provider.name} domain to Reverhost`,
      lead: `Add one DNS record at ${provider.name}, verify it, and Reverhost issues the HTTPS certificate.`,
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
      title: `A Free ${competitor.name} Alternative for Web Apps | Reverhost`,
      description: `Reverhost compared with ${competitor.name} for hosting apps built from a Dockerfile: free limits, runtime differences, what you lose by switching, and how to migrate.`,
      h1: `A free ${competitor.name} alternative for web apps`,
      lead: `Reverhost is a smaller, free option for apps in any language, built from your Dockerfile. Here are the honest differences from ${competitor.name}, including what you give up.`,
      crumbs: [HOME, ALTERNATIVES, { name: competitor.name, path }],
      body: `## How they compare

According to [${competitor.name}'s own page](${competitor.source}) as of October 2026, ${competitor.fact}. Check it for current details.

| Area | ${competitor.name} | Reverhost |
| --- | --- | --- |
${rows}
| Included with each app | Varies by plan | Postgres and S3 bucket per project |

## When Reverhost fits

- Side projects, prototypes and small apps in Node.js, Python, Go or any language you can write a Dockerfile for
- Projects where an AI agent handles deployment through a CLI
- Apps that need to stay on for free

## When ${competitor.name} is the better choice

- You need multiple regions, autoscaling or a production support plan
- You want Git-based deploys or preview environments
- Your app goes beyond what 256 MB of RAM and 0.5 CPU can handle

## How to move

Read the [${competitor.name} migration guide](/migrate/${competitor.id}), or browse [all migration guides](/migrate). If you have a database there, Reverhost's [Postgres](/products/postgres) accepts a normal ${q("pg_dump")}.`,
      faq: [
        { q: `Is Reverhost a full replacement for ${competitor.name}?`, a: "Not for every app. It runs one container per app from your Dockerfile, in one region, with fixed limits. It suits small apps that fit those limits." },
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
    return {
      family: "migration-guides",
      path,
      title: `Migrate From ${competitor.name} to Reverhost | Reverhost`,
      description: `Move an app from ${competitor.name} to Reverhost: export your variables, remove ${competitor.configFile}, add a Dockerfile, deploy with the CLI, then switch DNS.`,
      h1: `Migrate from ${competitor.name} to Reverhost`,
      lead: `Your code mostly stays the same. Export your variables, deploy with the CLI, then switch your domain once the new app works.`,
      crumbs: [HOME, MIGRATE, { name: competitor.name, path }],
      body: `## Steps

1. Export your variables. ${exportInstruction(competitor)}.
2. Remove or ignore ${q(competitor.configFile)}, because Reverhost does not read it.
3. Save a Dockerfile to the app with ${q("npx ezhst build dockerfile set -f Dockerfile")}. Start from ${q("npx ezhst build dockerfile template")} if you do not have one.
4. Deploy with ${q("npx ezhst deploy")}, and test the ${q("easyhost.fun")} URL.
5. Move your data, then point your domain at Reverhost.

## What changes

${competitor.name} runs your app on ${competitor.runtime}. Reverhost runs one always-on container per app, built from your Dockerfile, with 256 MB of RAM and 0.5 CPU, in one region.

## Move your data

- [Move a Postgres database](/migrate/postgres)
- [Move S3 files](/migrate/storage)`,
      faq: [],
    };
  });
};

const postgresMigrationPages = () => {
  const sources = POSTGRES_SOURCES.map((source) => {
    const path = `/migrate/postgres-from-${source.id}`;
    return {
      family: "migration-guides",
      path,
      title: `Move Postgres From ${source.name} to Reverhost | Reverhost`,
      description: `Copy a Postgres database from ${source.name} to free Reverhost Postgres with pg_dump and psql, including the right connection string and what to check.`,
      h1: `Move a Postgres database from ${source.name}`,
      lead: `Use the standard ${q("pg_dump")} and ${q("psql")} tools to copy your data into a free Postgres 16 database on Reverhost.`,
      crumbs: [HOME, MIGRATE, { name: "Postgres", path: "/migrate/postgres" }, { name: source.name, path }],
      body: `## Get both connection strings

For ${source.name}, use ${source.url}. ${source.note}

${fence("npx ezhst db create main\nnpx ezhst db info --json")}

## Copy the data

Use client tools at least as new as the source server. Run this during a quiet period so no writes are lost.

${fence('pg_dump --no-owner --no-acl --format=custom "$SOURCE_URL" -f backup.dump\npg_restore --no-owner --no-acl -d "$REVERHOST_URL" backup.dump')}

## Check and switch

${fence('npx ezhst db query "select count(*) from users"\nnpx ezhst env set DATABASE_URL="$REVERHOST_URL"\nnpx ezhst redeploy')}

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
      title: "Migrate a Postgres Database to Reverhost | Reverhost",
      description: "Move a Postgres database to free Reverhost Postgres with pg_dump and pg_restore. Choose your current provider for the exact connection details.",
      h1: "Migrate a Postgres database to Reverhost",
      lead: "Reverhost runs standard Postgres 16, so ordinary dump and restore tools work.",
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
      title: `Move Files From ${source.name} to Reverhost | Reverhost`,
      description: `Copy files from ${source.name} to a free S3 compatible bucket on Reverhost using rclone, with the exact remote configuration and a public-files warning.`,
      h1: `Move files from ${source.name} to Reverhost`,
      lead: `Use rclone to copy a bucket from ${source.name} into Reverhost storage.`,
      crumbs: [HOME, MIGRATE, { name: "Storage", path: "/migrate/storage" }, { name: source.name, path }],
      body: `## Configure rclone

${fence(`[source]
type = s3
provider = ${source.provider}
access_key_id = <key>
secret_access_key = <secret>${endpointLine}

[reverhost]
type = s3
provider = Minio
endpoint = https://storage.reverhost.com
region = us-east-1
force_path_style = true
access_key_id = <key>
secret_access_key = <secret>`, "rclone.conf")}

${source.note}

> Every file on Reverhost is public by URL. Do not copy private files.

## Copy

${fence("npx ezhst storage create files\nnpx ezhst storage info --json\nrclone copy source:my-bucket reverhost:<bucket> --progress")}

## Update your app

${fence("npx ezhst env set S3_ENDPOINT=https://storage.reverhost.com S3_BUCKET=<bucket>\nnpx ezhst redeploy")}

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
      title: "Migrate S3 Files to Reverhost Storage | Reverhost",
      description: "Copy files from another S3 compatible service to free Reverhost storage with rclone. Choose your current provider for the exact configuration.",
      h1: "Migrate S3 files to Reverhost",
      lead: "Reverhost storage speaks the S3 API, so rclone can copy your files directly.",
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
      title: `${product.title} | Reverhost`,
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
    title: "Reverhost Pricing: $0 With Published Limits",
    description: `Reverhost is free for ${limits.projects} projects with ${limits.apps} apps each, Postgres and S3 storage. Pro is $${limits.proPrice} a month for ${limits.proProjects} projects and AI tokens.`,
    h1: "Pricing and limits",
    lead: `Hosting on Reverhost starts at $0 per month, with no credit card and no trial period. Pro costs $${limits.proPrice} a month and adds more projects and monthly AI tokens.`,
    crumbs: [HOME, { name: "Pricing", path: "/pricing" }],
    body: `## Plans

| | Free | Pro |
| --- | --- | --- |
| Price | $0 | $${limits.proPrice} per month |
| Projects | ${limits.projects} | ${limits.proProjects} |
| Apps | ${limits.apps} per project | ${limits.apps} per project |
| Postgres database | 1 per project, ${limits.dbMb} MB | 1 per project, ${limits.dbMb} MB |
| Storage | 1 bucket per project, ${limits.storageMb} MB | 1 bucket per project, ${limits.storageMb} MB |
| AI tokens | First AI app and build free | ${limits.proTokens.toLocaleString("en-US")} every month |

Upgrade from the Subscription page in the dashboard or with \`ezhst billing upgrade\`. A full storage bucket rejects uploads. A database that grows past its size is blocked, and the project's apps stop until you free space.

## Other limits

| Resource | Limit |
| --- | --- |
| Project members | ${limits.projectMembers} per project, including pending invites |
| AI Builder prompts | ${limits.aiPromptsPerDay} per day, per project |
| Concurrent builds | 1 per app |
| Builds per day | ${limits.buildsPerDay} on Free, ${limits.proBuildsPerDay} on Pro, per account owner |
| App container | ${limits.appMemoryMb} MB RAM, ${limits.appCpus} CPU |
| Image size | ${limits.maxImageGb} GB |

## AI Builder tokens

Each account gets its first AI app and its first build free. After that, AI requests use AI tokens. Pro tops your balance up to ${limits.proTokens.toLocaleString("en-US")} tokens every month. Each request is charged by how much work it takes, and a typical full build is a few hundred tokens. See the [AI Builder](/products/ai-builder).

## What it does not include

- Git integration or preview deployments
- An edge network or multiple regions

## Compare

See how Reverhost differs from [other hosts](/alternatives), or browse [products](/products).`,
    faq: [
      { q: "Do I need a credit card?", a: "No. The free plan needs no card. You only pay if you upgrade to Pro." },
      { q: "What happens if a Pro payment fails?", a: "Your account goes back to the free plan until the payment goes through. Projects beyond the free limit are paused." },
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
      title: `ezhst ${name} Command: CLI Reference | Reverhost`,
      description: `${summary} Usage, notes and JSON output for the ezhst ${name} command in the Reverhost CLI.`,
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
  const full = `${error.title}: How to Fix It | Reverhost`;
  if (full.length <= 65) {
    return full;
  }
  return `${error.title} | Reverhost`;
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

const frameworkHubPages = () => {
  return FRAMEWORKS.map((framework) => {
    const own = SERVICE_ORM_PAGES[framework.id];
    let databases;
    if (own) {
      databases = `- [${own.name}](/guides/${framework.id}-${own.id}-postgres)`;
    } else {
      databases = ORMS.map((orm) => `- [${orm.name}](/guides/${framework.id}-${orm.id}-postgres)`).join("\n");
    }
    const migrations = COMPETITORS.map((competitor) => `- [From ${competitor.name}](/migrate/${competitor.id})`).join("\n");
    return {
      family: "frameworks",
      path: hubPath(framework),
      title: `${framework.name} on Reverhost: Guides and Hosting`,
      description: `Everything for running ${framework.name} on Reverhost: free hosting, environment variables, Postgres with Prisma, storage and migration guides.`,
      h1: `${framework.name} on Reverhost`,
      lead: `${framework.name} is a ${framework.kind}. These guides cover hosting it for free and connecting it to Postgres and storage.`,
      crumbs: [HOME, FRAMEWORKS_HUB, { name: framework.name, path: hubPath(framework) }],
      body: `## Start here

- [Free ${framework.name} hosting](${hostingPath(framework)})
- [Environment variables](/guides/${framework.id}-environment-variables)
- [Fix an unreachable app](/errors/${framework.id}-app-unreachable)

## Deploy with an AI agent

- [Deploy with AI agents](/guides/deploy-nextjs-with-ai-agents)

## Postgres

${databases}

## Storage

- [S3 compatible storage](/products/storage)

## Migrate

${migrations}`,
      faq: [],
    };
  });
};


const languagePath = (language) => `/languages/${language.id}`;
const languageIcon = (language) => `/languages/${language.id}.svg`;
const stackPath = (stack) => `/free-${stack.id}-hosting`;
const stackIcon = (stack) => `/frameworks/${stack.id}.svg`;
const languageOf = (stack) => LANGUAGES.find((language) => language.id === stack.language);

const runtimeLimits = (limits) => `${limits.appMemoryMb} MB of RAM with no swap, ${limits.appCpus} CPU and images up to ${limits.maxImageGb} GB`;

const templateFor = (templates, id) => {
  const template = templates.find((item) => item.id === id);
  if (!template) {
    throw new Error(`No Dockerfile template with id ${id}`);
  }
  return template;
};

const languagePages = (limits, templates) => {
  return LANGUAGES.map((language) => {
    const path = languagePath(language);
    const template = templateFor(templates, language.template);
    const links = language.links.map(([name, href]) => `- [${name}](${href})`).join("\n");
    return {
      family: "languages",
      path,
      icon: languageIcon(language),
      title: `Free ${language.name} Hosting With Postgres | Reverhost`,
      description: `Host a ${language.name} app for $0 from a starter Dockerfile, on an always-on container with Postgres, S3 storage and custom domains. No credit card.`,
      h1: `Free ${language.name} hosting`,
      lead: `Run ${language.name}, a ${language.kind}, in an always-on container built from your Dockerfile. Start from the ${language.name} template, deploy with the CLI and add Postgres and storage for $0.`,
      crumbs: [HOME, LANGUAGES_HUB, { name: language.name, path }],
      body: `## What you can run

Any ${language.name} web app or API that listens on HTTP, including ${language.frameworks}.

${links}

## The starter Dockerfile

This is the ${q(language.template)} template, exactly as ${q(`ezhst build dockerfile template ${language.template}`)} prints it.

${fence(template.content.trimEnd(), "Dockerfile")}

## Adapt it to your app

${language.adapt}

- Listen on ${q("0.0.0.0")} and the ${q("PORT")} variable, which is ${q("3000")}. A server bound to localhost never receives traffic.
- Your variables are runtime env in the container. If a build command needs them, run it in a ${q("RUN")} step that mounts the ${q("appenv")} secret, as the template does. See [build-time environment variables](/guides/build-time-environment-variables).
- Never put secrets in ${q("ARG")} or ${q("ENV")}, because they end up in the image.

${fence(language.listen.code, language.listen.label)}

## Deploy it

${fence(`npx ezhst projects create my-project --link\nnpx ezhst apps create my-app\nnpx ezhst build dockerfile template ${language.template} --apply\nnpx ezhst env import .env\nnpx ezhst deploy`)}

${q("--apply")} saves the template to the app. To use an edited copy instead, save it as ${q("Dockerfile")} and run ${q("npx ezhst build dockerfile set -f Dockerfile")}. Read [how to write a Dockerfile for Reverhost](/guides/write-a-dockerfile) for the general rules.

## Limits

Each app gets ${runtimeLimits(limits)}. A project holds ${limits.apps} apps, a ${limits.dbMb} MB Postgres database and ${limits.storageMb} MB of S3 storage. One build runs at a time per app, with up to ${limits.buildsPerDay} builds a day on the free plan. See [pricing and limits](/pricing).

## Connect Postgres and S3

${fence("npx ezhst db create main\nnpx ezhst db info --json\nnpx ezhst storage create files\nnpx ezhst storage info --json")}

${language.postgres} ${language.storage} See the [Postgres](/products/postgres) and [storage](/products/storage) product pages.`,
      faq: [
        { q: `Is ${language.name} hosting on Reverhost free?`, a: "Yes. It costs $0 per month with no credit card and no trial period, within the published limits." },
        { q: `Is a Dockerfile in my repository used automatically?`, a: "No. The Dockerfile is stored on the app. Save it with `ezhst build dockerfile set -f Dockerfile`, or apply a template, before you deploy." },
        language.faq,
      ],
    };
  });
};

const languagesHubPage = (limits) => {
  const links = LANGUAGES.map((language) => `- [${language.name}](${languagePath(language)}): template ${q(language.template)}`).join("\n");
  return {
    family: "indexes",
    path: "/languages",
    title: "Host Any Language From a Dockerfile | Reverhost",
    description: "Free hosting for Node.js, Bun, Python, Go, Ruby, PHP, Rust and Zig apps, each with a starter Dockerfile you can apply with one command.",
    h1: "Languages",
    lead: "Every Reverhost app builds from a Dockerfile stored on the app. Start from one of these templates, or write your own for any other language.",
    crumbs: [HOME, LANGUAGES_HUB],
    tiles: LANGUAGES.map((language) => {
      return { name: language.name, src: languageIcon(language), href: languagePath(language), meta: `template ${language.template}` };
    }),
    body: `## Starter Dockerfiles

${links}

## Use a template

${fence("npx ezhst build dockerfile template\nnpx ezhst build dockerfile template fastapi\nnpx ezhst build dockerfile template fastapi --apply")}

Without an id, the command lists every template. With an id it prints the Dockerfile, and ${q("--apply")} saves it to the linked app.

## Rules for every language

Listen on ${q("0.0.0.0:$PORT")}, keep the image under ${limits.maxImageGb} GB and pass build-time values through the ${q("appenv")} secret. The [Dockerfile guide](/guides/write-a-dockerfile) covers the details, and the [frameworks hub](/frameworks) has framework-specific Dockerfiles.`,
    faq: [],
  };
};

const stackPages = (limits) => {
  return STACKS.map((stack) => {
    const path = stackPath(stack);
    const language = languageOf(stack);
    const steps = ["npx ezhst projects create my-project --link", "npx ezhst apps create my-app"];
    for (const command of stack.commands) {
      steps.push(`npx ${command}`);
    }
    steps.push("npx ezhst build dockerfile set -f Dockerfile", "npx ezhst env import .env", "npx ezhst deploy");
    return {
      family: "hosting",
      path,
      icon: stackIcon(stack),
      title: `Free ${stack.name} Hosting With Postgres and S3 | Reverhost`,
      description: `Host a ${stack.name} app for $0 on an always-on container, with a ready Dockerfile, Postgres, S3 storage and custom domains. No credit card.`,
      h1: `Free ${stack.name} hosting`,
      lead: `Reverhost runs ${stack.name}, a ${stack.kind}, in an always-on container built from your Dockerfile, for $0. No credit card is needed, and your agent can deploy it with one instruction.`,
      crumbs: [HOME, FRAMEWORKS_HUB, { name: `${stack.name} hosting`, path }],
      body: `## What you get

- An always-on container with ${runtimeLimits(limits)}
- A URL at ${q("<app-slug>.easyhost.fun")}, plus custom domains with HTTPS
- One Postgres 16 database and one S3 bucket per project
- ${limits.apps} apps per project, with a ${limits.dbMb} MB database and ${limits.storageMb} MB of storage

## How ${stack.name} builds and runs

| Step | What your Dockerfile runs |
| --- | --- |
| Build | ${stack.build} |
| Start | ${stack.start} |
| Runtime env | ${q("PORT=3000")} and ${q("HOSTNAME=0.0.0.0")} from Reverhost, plus your own variables |

${stack.setup}

${fence(stack.entry.code, stack.entry.label)}

## The Dockerfile

${fence(stack.dockerfile, "Dockerfile")}

Save it as ${q("Dockerfile")} in your project folder. It is based on the [${language.name} template](${languagePath(language)}).

## Deploy it

${fence(steps.join("\n"))}

## Connect Postgres

${fence("npx ezhst db create main\nnpx ezhst db info --json\nnpx ezhst env set DATABASE_URL=\"postgresql://...\"\nnpx ezhst redeploy")}

${language.postgres}

## Limits and caveats

${stack.caveat}

Apps run in one region, with no edge network, preview deployments or Git integration. See [all frameworks](/frameworks) and [${language.name} hosting](${languagePath(language)}).`,
      faq: [
        { q: `Is ${stack.name} hosting on Reverhost really free?`, a: "Yes. It costs $0 per month with no credit card and no trial period, within the published limits." },
        { q: `Does my ${stack.name} app sleep when idle?`, a: "No. Reverhost apps run in an always-on container and do not sleep when idle." },
      ],
    };
  });
};

const dockerfileGuidePages = (limits) => {
  const guide = (path, title, description, h1, lead, body, faq) => {
    return { family: "dockerfile-guides", path, title, description, h1, lead, crumbs: [HOME, GUIDES, { name: h1, path }], body, faq };
  };
  const secretLine = buildStep("npm run build");
  return [
    guide(
      "/guides/write-a-dockerfile",
      "Write a Dockerfile for Reverhost | Reverhost",
      "The rules for a Dockerfile that builds and runs on Reverhost: base image, COPY order, port, build secrets, multi-stage builds, image size and .dockerignore.",
      "Write a Dockerfile for Reverhost",
      "Every Reverhost app builds from a Dockerfile stored on the app. These rules keep it fast to build, small and safe.",
      `## Start from a template

${fence("npx ezhst build dockerfile template\nnpx ezhst build dockerfile template node > Dockerfile")}

Templates exist for [Node.js](/languages/nodejs), [Bun](/languages/bun), [Python](/languages/python), [Go](/languages/go), [Ruby](/languages/ruby), [PHP](/languages/php), [Rust](/languages/rust) and [Zig](/languages/zig). Any other language works if you write the Dockerfile yourself.

## Pick the base image with FROM

The ${q("FROM")} line decides your language version. Prefer ${q("-slim")} or ${q("-alpine")} variants, such as ${q("python:3.12-slim")} or ${q("node:22-alpine")}, because the final image must stay under ${limits.maxImageGb} GB.

## Copy manifests before source

Copy the dependency manifest and lockfile first, install, then copy the rest. Dependency layers are reused when only your code changes.

${fence('COPY package*.json ./\nRUN npm ci\nCOPY . .', "Dockerfile")}

## Listen on 0.0.0.0 and PORT

Reverhost sends traffic to port ${q("3000")} and sets ${q("PORT=3000")}. Bind to ${q("0.0.0.0")}, not localhost, and add ${q("EXPOSE 3000")} for clarity. Write ${q("CMD")} with ${q('sh -c "exec ..."')} when it needs ${q("$PORT")}, so the variable expands and your process still receives signals.

## Pass build-time values as a secret

Your variables are runtime env in the container. A build step that needs them mounts the ${q("appenv")} secret:

${fence(secretLine, "Dockerfile")}

Never use ${q("ARG")} or ${q("ENV")} for secrets. See [build-time environment variables](/guides/build-time-environment-variables).

## Use multi-stage builds

Compile in one stage and copy only the output into a small runtime image. Compilers, caches and dev dependencies then stay out of the final image. The [Rust or Go binary guide](/guides/deploy-rust-or-go-binary) shows a full example.

## Keep the upload small with .dockerignore

${q("ezhst deploy")} already skips ${q("node_modules")}, ${q(".git")}, ${q(".env*")}, Python virtual environments, Rust ${q("target")} and Zig output. Add a ${q(".dockerignore")} for anything else that should not reach the build, such as test fixtures or local data.

${fence("node_modules\ncoverage\n*.log\ndata/", ".dockerignore")}

## Save it to the app

${fence("npx ezhst build dockerfile set -f Dockerfile\nnpx ezhst deploy")}

A Dockerfile in your repository is not used until you upload it. After editing it, upload again and run ${q("npx ezhst redeploy")}, which rebuilds the latest upload even if it failed.`,
      [
        { q: "Can I keep the Dockerfile in a subfolder?", a: "Yes. Upload it from anywhere with `ezhst build dockerfile set -f path/to/Dockerfile`. Its `COPY` paths are relative to the build context, which `ezhst build set --root-dir` controls." },
        { q: "What happens when the image is too large?", a: "The build fails with the image size and the limit. Use a slimmer base image or a multi-stage build." },
      ],
    ),
    guide(
      "/guides/build-time-environment-variables",
      "Use Environment Variables at Build Time | Reverhost",
      "Read your Reverhost environment variables during a Docker build with the appenv secret mount, and why secrets must never go in ARG or ENV.",
      "Use environment variables at build time",
      "Your variables are runtime env in the container. When a build step needs them, mount them as a secret for that one step.",
      `## Set your variables

${fence("npx ezhst env set NEXT_PUBLIC_SITE_URL=https://my-app.easyhost.fun\nnpx ezhst env import .env")}

${q(".env")} files are never uploaded by ${q("deploy")}, so set values with the CLI or the dashboard.

## Mount the appenv secret

During the build, your variables and ${q("PORT")} are available as a file at ${q("/run/secrets/appenv")}, but only in a ${q("RUN")} step that mounts it. Load the file, then run your command:

${fence(secretLine, "Dockerfile")}

${q("set -a")} exports every variable the file defines, so tools such as ${q("next build")} or ${q("vite build")} see them. The values exist only while that step runs and are not stored in the image.

## When you need this

- Frameworks that inline public values at build time, such as ${q("NEXT_PUBLIC_")} or ${q("VITE_")} variables
- Build steps that call an API or download private packages
- Code generation that reads a database URL, such as ${q("prisma generate")}

A step that does not need your variables can be a plain ${q("RUN")} line.

## Never use ARG or ENV for secrets

${q("ARG")} values are recorded in the image history, and ${q("ENV")} values are baked into every layer after them. Anyone with the image can read both. Use ${q("ENV")} only for non-secret settings such as ${q("NODE_ENV=production")}.

## Apply changes

${fence("npx ezhst env set NEXT_PUBLIC_API_URL=https://api.example.com\nnpx ezhst redeploy")}

Build-time values are fixed into the build output, so changing one needs a rebuild. Runtime values apply on the next ${q("deploy")} or ${q("redeploy")}. See [write a Dockerfile](/guides/write-a-dockerfile) for the other rules.`,
      [
        { q: "Why is my variable undefined during the build?", a: "The build step does not mount the appenv secret. Wrap the command with the secret mount shown above, upload the Dockerfile and redeploy." },
      ],
    ),
    guide(
      "/guides/deploy-python-with-postgres",
      "Deploy Python With Postgres for Free | Reverhost",
      "Deploy a FastAPI or Django app with a free Postgres 16 database on Reverhost: Dockerfile, DATABASE_URL, drivers and running migrations.",
      "Deploy Python with Postgres",
      "Run a FastAPI or Django app on Reverhost and connect it to the project's free Postgres 16 database.",
      `## Create the database

${fence('npx ezhst db create main\nnpx ezhst db info --json\nnpx ezhst env set DATABASE_URL="postgresql://..."')}

The connection string uses a public host with TLS, so it also works from your laptop for migrations.

## FastAPI with SQLAlchemy

Add ${q("fastapi")}, ${q("uvicorn")}, ${q("sqlalchemy")} and ${q("psycopg[binary]")} to ${q("requirements.txt")}.

${fence('import os\n\nfrom sqlalchemy import create_engine, text\n\nurl = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+psycopg://", 1)\nengine = create_engine(url, pool_size=5)\n\n\ndef count_users():\n    with engine.connect() as conn:\n        return conn.execute(text("select count(*) from users")).scalar()', "db.py")}

The [Python template](/languages/python) runs FastAPI as is. See [FastAPI hosting](/free-fastapi-hosting) for the full Dockerfile.

## Django with dj-database-url

Add ${q("dj-database-url")} and ${q("psycopg[binary]")}, then read the URL in settings.

${fence('import os\n\nimport dj_database_url\n\nDATABASES = {"default": dj_database_url.parse(os.environ["DATABASE_URL"], conn_max_age=60)}', "mysite/settings.py")}

[Django hosting](/free-django-hosting) has a Dockerfile that runs gunicorn and collects static files.

## Run migrations

Run them from your machine with ${q("DATABASE_URL")} set to the Reverhost connection string.

${fence("alembic upgrade head\npython manage.py migrate")}

Use Alembic for SQLAlchemy and ${q("manage.py migrate")} for Django. Commit migration files so every environment applies the same changes.

## Deploy

${fence("npx ezhst build dockerfile template fastapi --apply\nnpx ezhst deploy")}

Each database allows 20 connections, so keep pools small. See the [Postgres product page](/products/postgres).`,
      [
        { q: "Which Postgres driver should I use?", a: "psycopg 3 for SQLAlchemy and Django, or asyncpg for async code. Both accept the connection string from `ezhst db info`." },
      ],
    ),
    guide(
      "/guides/deploy-rust-or-go-binary",
      "Deploy a Rust or Go Binary From a Dockerfile | Reverhost",
      "Build a Rust or Go web service in a multi-stage Dockerfile, ship a small runtime image with a static binary, and run it for free on Reverhost.",
      "Deploy a Rust or Go binary",
      "Compile in one stage, run in another. A multi-stage Dockerfile keeps the compiler out of the image, so a Rust or Go service ships as one small binary.",
      `## Go: a static binary on Alpine

${fence(`FROM golang:1.23-alpine AS build\nWORKDIR /src\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 go build -o /out/app .\n\nFROM alpine:3.21\nRUN apk add --no-cache ca-certificates\nCOPY --from=build /out/app /app/app\nENV PORT=3000\nEXPOSE 3000\nCMD ["/app/app"]`, "Dockerfile")}

${q("CGO_ENABLED=0")} produces a static binary with no C library dependency, so it runs on Alpine or even ${q("scratch")}. Keep ${q("ca-certificates")} so TLS connections to Postgres and S3 work.

## Rust: a release binary on Debian slim

${fence(`FROM rust:1.83-slim AS build\nWORKDIR /src\nCOPY . .\nRUN cargo build --release && cp target/release/my-app /app-bin\n\nFROM debian:bookworm-slim\nRUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*\nCOPY --from=build /app-bin /app/app\nENV PORT=3000\nEXPOSE 3000\nCMD ["/app/app"]`, "Dockerfile")}

Replace ${q("my-app")} with your binary name. Prefer rustls features in your crates so the runtime image needs no OpenSSL.

## Listen on PORT

Read ${q("PORT")} and bind to ${q("0.0.0.0")}: ${q('"0.0.0.0:" + os.Getenv("PORT")')} in Go, or ${q('TcpListener::bind(("0.0.0.0", port))')} in Rust.

## Deploy

${fence("npx ezhst build dockerfile set -f Dockerfile\nnpx ezhst deploy")}

Or start from the [Go](/languages/go) or [Rust](/languages/rust) template with ${q("npx ezhst build dockerfile template go --apply")}. Framework examples are on the [Gin](/free-gin-hosting) and [Axum](/free-axum-hosting) pages.

## Size and memory

A compiled service usually uses a few megabytes of RAM, well inside ${limits.appMemoryMb} MB, and its image is far below the ${limits.maxImageGb} GB limit. If a build needs build-time variables, mount the appenv secret as shown in [build-time environment variables](/guides/build-time-environment-variables).`,
      [
        { q: "Can I use a scratch image?", a: "Yes for a static Go binary. Copy the CA certificates from the build stage too, or TLS connections fail." },
      ],
    ),
  ];
};

const indexPages = (pages) => {
  const listFamily = (family) => {
    return pages
      .filter((page) => page.family === family)
      .map((page) => `- [${page.h1}](${page.path})`)
      .join("\n");
  };
  const guideLinks = FRAMEWORKS.map((framework) => `- [${framework.name} guides](${hubPath(framework)})`).join("\n");
  const stackLinks = STACKS.map((stack) => `- [${stack.name}](${stackPath(stack)}), ${languageOf(stack).name}`).join("\n");
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
    {
      ...hub("/frameworks", "Frameworks You Can Host for Free | Reverhost", "Free hosting and guides for Next.js, Nuxt, Express, NestJS, Remix, SvelteKit, Astro, FastAPI, Django, Laravel, Rails, Gin, Axum and more.", "Frameworks", "Reverhost runs any app you can build with a Dockerfile. These frameworks have dedicated guides.", `## Node.js frameworks\n\n${guideLinks}\n\n## Other languages\n\n${stackLinks}\n\nBrowse [all languages](/languages) for starter Dockerfiles.`),
      tiles: [
        ...FRAMEWORKS.map((framework) => {
          return { name: framework.name, src: `/frameworks/${framework.id}.svg`, href: hubPath(framework) };
        }),
        ...STACKS.map((stack) => {
          return { name: stack.name, src: stackIcon(stack), href: stackPath(stack) };
        }),
      ],
    },
    hub("/guides", "Reverhost Guides: Deploy, Database, Storage and Domains", "Step by step guides for deploying apps on Reverhost from a Dockerfile, connecting Postgres and S3 storage and adding custom domains.", "Guides", "Practical guides, grouped by framework.", `## Dockerfiles and languages\n\n${listFamily("dockerfile-guides")}\n- [All languages](/languages)\n\n## By framework\n\n${guideLinks}\n\n## Custom domains\n\n${listFamily("domain-guides")}\n\n## Migrate\n\n- [All migration guides](/migrate)\n- [Move a Postgres database](/migrate/postgres)\n- [Move S3 files](/migrate/storage)\n\n## Agents\n\n- [Deploy Next.js with AI agents](/guides/deploy-nextjs-with-ai-agents)`),
    hub("/errors", "Deployment Errors and Fixes | Reverhost", "Fixes for common deployment errors: missing Dockerfiles, failed installs, missing modules, memory limits, database connections, S3 signatures and domain verification.", "Deployment errors", "Find your error message, why it happens and the commands that fix it.", `## All errors\n\n${listFamily("errors")}`),
    hub("/migrate", "Migrate to Reverhost From Other Hosts | Reverhost", "Move an app to Reverhost from Vercel, Render, Railway, Netlify, Fly.io, Heroku or Koyeb, along with your Postgres database and S3 files.", "Migrate to Reverhost", "Guides for moving your app and data.", `## Move your app\n\n${migrateLinks}\n\n## Move your data\n\n- [Postgres](/migrate/postgres)\n- [S3 files](/migrate/storage)`),
    hub("/alternatives", "Free Alternatives to Popular Hosting Platforms | Reverhost", "Honest comparisons between Reverhost and Vercel, Render, Railway, Netlify, Fly.io, Heroku and Koyeb, including what you give up by switching.", "Alternatives", "Honest comparisons, including when the other platform is the better choice.", `## Compare\n\n${competitorLinks}`),
    hub("/docs/cli", "ezhst CLI Reference: Every Command | Reverhost", "Reference for every ezhst command: account, deploy, env, build, domains, storage, database and members, with usage and JSON output notes.", "CLI reference", "One page per `ezhst` command. The [main docs](/docs) cover the same commands on a single page.", cliGroups),
    hub("/products", "Reverhost Products: Hosting, Postgres, Storage, Domains", "On Reverhost: free app hosting in any language, Postgres, S3 storage, custom domains, team members, a CLI, an agent skill and an AI app builder.", "Products", "Hosting is free within the [published limits](/pricing). Pro adds more projects and monthly AI tokens.", `## All products\n\n${productLinks}`),
  ];
};

const legalPages = () => {
  const contact = "If you have any questions, write to us at [hello@reverhost.com](mailto:hello@reverhost.com). We are happy to help.";
  return [
    {
      family: "legal",
      path: "/privacy",
      title: "Privacy Policy | Reverhost",
      description: "What Reverhost collects, how it is used, which services help us run the platform, and how to keep sensitive data private with your own encryption.",
      h1: "Privacy policy",
      lead: "Reverhost is a small hosting platform in beta. This page explains in plain words what we collect, how we use it and how you can keep sensitive data private.",
      crumbs: [HOME, { name: "Privacy policy", path: "/privacy" }],
      body: `## What we collect

- Account details: your name, email address and a hashed password.
- What you create on Reverhost: source code, build logs, environment variables, database contents, storage files and AI Builder chats and files.
- Usage data: deployments, builds, app logs, resource usage, IP addresses in server logs, and AI Token purchases and usage.
- Dashboard analytics: the dashboard uses Microsoft Clarity to understand how pages are used, so we can improve them.

## How your data is protected

Data is sent over encrypted connections (HTTPS, and TLS for Postgres). Once stored, your data is kept as you send it: Reverhost does not add its own layer of encryption on top.

For anything sensitive, we recommend encrypting it in your app before you store it and keeping the keys outside Reverhost. That way it stays private no matter where it is stored.

Files in storage buckets are public to anyone who has the URL, so please keep private files encrypted or somewhere else.

## When we access your data

We only look at your projects and data when there is a good reason, such as:

- keeping the platform secure, for example investigating abuse, spam or malware
- making sure the platform is used in line with the [terms](/terms)
- helping you when you ask for support, or fixing a problem with your project
- answering valid legal requests

We do not sell your data and we never use it for advertising.

## Services that help us run Reverhost

- Google Cloud Build and Cloud Storage build your app images from your source code.
- Google Gemini powers the AI Builder and sees your prompts and app files.
- Lemon Squeezy handles Pro subscription payments. We never see your card details.
- Resend sends account emails such as verification codes and invites.
- Microsoft Clarity provides dashboard usage analytics.

## How long we keep it

We keep your data while your account and projects exist. When you delete a project, its apps, images, database, bucket and files are removed. Logs and backups may keep copies for a short time afterwards.

## Your choices

You can export your database and files at any time and delete any project from the dashboard. To delete your account, email us from the address on the account.

## Changes

We may update this page from time to time. The date at the top shows the last change.

${contact}`,
      faq: [],
    },
    {
      family: "legal",
      path: "/terms",
      title: "Terms and Conditions | Reverhost",
      description: "The terms for using Reverhost: fair use, how your data is stored, when we may review projects, beta status and what we can and cannot promise.",
      h1: "Terms and conditions",
      lead: "Thanks for using Reverhost. These terms explain how the service works and what we expect from each other. By using Reverhost, you agree to them.",
      crumbs: [HOME, { name: "Terms and conditions", path: "/terms" }],
      body: `## The service

Reverhost hosts apps in any language, Postgres databases, S3 storage and AI built apps, within the [published limits](/pricing). Reverhost is in beta, so features and limits may change as the platform grows.

## Your account

Please keep your password and tokens safe. You are responsible for what runs in your projects, including changes made by members you invite.

## Your content

Your code and data stay yours. You allow us to store, build, run and serve them so we can provide the service.

## How your data is stored

Data is sent over encrypted connections, but Reverhost does not add its own encryption to stored data. If you store anything sensitive, we recommend encrypting it yourself before storing it. The [privacy policy](/privacy) has more detail.

## Keeping the platform safe

To keep Reverhost secure and reliable for everyone, we may review projects, logs and account activity when needed, for example to look into a security issue, a report of abuse or a support request.

## Fair use

Please do not use Reverhost to:

- host phishing, malware, scams, spam or illegal content
- attack or overload other systems, or mine cryptocurrency
- get around the limits, for example with many accounts
- harm other customers or the platform

## If something goes wrong

If a project breaks these terms or puts the platform at risk, we may pause or remove it. We will try to contact you first, unless there is an urgent risk to others.

## Pro subscription

Pro is billed monthly until you cancel. You can cancel at any time from the Subscription page, and Pro stays active until the end of the paid period. Payments already made are not refundable, except where the law requires it. AI tokens come with Pro, are topped up each month and have no cash value.

## Availability

We work hard to keep Reverhost running well, but we cannot guarantee it will always be available or free of data loss. The service is provided as is, so please keep your own backups of anything important.

## Liability

As far as the law allows, Reverhost is not liable for indirect losses such as lost data or lost profits, and our total liability is limited to what you paid us in the last 12 months.

## Changes

We may update these terms as Reverhost changes. If you keep using Reverhost after an update, the new terms apply.

${contact}`,
      faq: [],
    },
  ];
};

export const buildPages = (limits, templates) => {
  const pages = [
    ...languagePages(limits, templates),
    languagesHubPage(limits),
    ...stackPages(limits),
    ...dockerfileGuidePages(limits),
    ...productPages(),
    pricingPage(limits),
    ...legalPages(),
    ...hostingPages(limits),
    ...frameworkHubPages(),
    ...databasePages(),
    ...envPages(),
    ...dnsPages(),
    ...comparisonPages(),
    ...migrationHubPages(),
    ...postgresMigrationPages(),
    ...storageMigrationPages(),
    ...cliPages(),
    ...errorPages(),
    ...unreachablePages(),
  ];
  return [...pages, ...indexPages(pages)];
};
