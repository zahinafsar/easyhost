import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { inline, renderMarkdown } from "./markdown.mjs";
import { buildPages } from "./pages.mjs";

export const SITE = "https://easyhost.fun";
export const UPDATED = "2026-11-10";
export const UPDATED_LABEL = new Date(UPDATED).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export const HELD_BACK_FAMILIES = new Set([
  "agent-guides",
  "package-manager-guides",
  "database-guides",
  "storage-guides",
  "env-guides",
  "monorepo-guides",
  "migration-framework-guides",
]);

export const FOOTER_COLUMNS = [
  {
    title: "Products",
    links: [
      ["/products/app-hosting", "Node.js hosting"],
      ["/products/postgres", "Postgres database"],
      ["/products/storage", "S3 storage"],
      ["/products/email", "Email (coming soon)"],
      ["/products/custom-domains", "Custom domains"],
      ["/products/cli", "ezhst CLI"],
      ["/products/agent-skill", "Agent skill"],
      ["/products/ai-builder", "AI Builder"],
      ["/products/team-members", "Team members"],
      ["/pricing", "Pricing and limits"],
    ],
  },
  {
    title: "Free hosting",
    links: [
      ["/free-nextjs-hosting", "Next.js"],
      ["/free-nuxt-hosting", "Nuxt"],
      ["/free-express-hosting", "Express"],
      ["/free-nestjs-hosting", "NestJS"],
      ["/free-fastify-hosting", "Fastify"],
      ["/free-hono-hosting", "Hono"],
      ["/free-koa-hosting", "Koa"],
      ["/free-adonisjs-hosting", "AdonisJS"],
      ["/free-remix-hosting", "Remix"],
      ["/free-sveltekit-hosting", "SvelteKit"],
      ["/free-astro-hosting", "Astro"],
      ["/free-strapi-hosting", "Strapi"],
      ["/free-postgres-hosting", "Postgres"],
      ["/frameworks", "All frameworks"],
    ],
  },
  {
    title: "Guides",
    links: [
      ["/guides/deploy-nextjs-with-ai-agents", "Deploy with AI agents"],
      ["/guides/deploy-nextjs-with-claude-code", "Next.js with Claude Code"],
      ["/guides/deploy-nextjs-with-cursor", "Next.js with Cursor"],
      ["/guides/deploy-nextjs-with-codex", "Next.js with Codex"],
      ["/guides/nextjs-prisma-postgres", "Next.js with Prisma"],
      ["/guides/nestjs-typeorm-postgres", "NestJS with TypeORM"],
      ["/guides/express-file-uploads-aws-sdk", "Express file uploads"],
      ["/guides/custom-domain-cloudflare", "Cloudflare custom domain"],
      ["/guides", "All guides"],
    ],
  },
  {
    title: "Compare",
    links: [
      ["/vercel-alternative", "Vercel alternative"],
      ["/render-alternative", "Render alternative"],
      ["/railway-alternative", "Railway alternative"],
      ["/netlify-alternative", "Netlify alternative"],
      ["/fly-alternative", "Fly.io alternative"],
      ["/heroku-alternative", "Heroku alternative"],
      ["/koyeb-alternative", "Koyeb alternative"],
      ["/alternatives", "All comparisons"],
    ],
  },
  {
    title: "Migrate",
    links: [
      ["/migrate/vercel", "From Vercel"],
      ["/migrate/render", "From Render"],
      ["/migrate/railway", "From Railway"],
      ["/migrate/netlify", "From Netlify"],
      ["/migrate/fly", "From Fly.io"],
      ["/migrate/heroku", "From Heroku"],
      ["/migrate/koyeb", "From Koyeb"],
      ["/migrate/postgres", "Move a Postgres database"],
      ["/migrate/storage", "Move S3 files"],
      ["/migrate", "All migrations"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["/docs", "Documentation"],
      ["/docs/cli", "CLI reference"],
      ["/errors", "Deployment errors"],
      ["/learn", "Learn hosting"],
      ["/skill.md", "skill.md"],
      ["/llms.txt", "llms.txt"],
      ["/sitemap.xml", "Sitemap"],
      ["https://app.easyhost.fun/login", "Log in"],
      ["https://app.easyhost.fun/register", "Sign up"],
      ["mailto:hello@easyhost.fun", "Contact"],
      ["/privacy", "Privacy policy"],
      ["/terms", "Terms and conditions"],
    ],
  },
];

export const absolute = (path) => {
  if (path === "/") {
    return `${SITE}/`;
  }
  return `${SITE}${path}`;
};

export const jsonLd = (page) => {
  const breadcrumb = page.crumbs.map((crumb, position) => {
    return { "@type": "ListItem", position: position + 1, name: crumb.name, item: absolute(crumb.path) };
  });
  const organization = { "@type": "Organization", name: "EasyHost", url: `${SITE}/` };
  const graph = [
    {
      "@type": "TechArticle",
      headline: page.h1,
      description: page.description,
      url: absolute(page.path),
      image: `${SITE}/og.png`,
      datePublished: UPDATED,
      dateModified: UPDATED,
      author: organization,
      publisher: { ...organization, logo: `${SITE}/icon-512.png` },
      mainEntityOfPage: absolute(page.path),
    },
    { "@type": "BreadcrumbList", itemListElement: breadcrumb },
  ];
  if (page.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => {
        return {
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a.replaceAll("`", "") },
        };
      }),
    });
  }
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("<", "\\u003c");
};

const SITEMAP_RULES = {
  core: { changefreq: "monthly", priority: 0.9 },
  indexes: { changefreq: "weekly", priority: 0.9 },
  products: { changefreq: "monthly", priority: 0.8 },
  hosting: { changefreq: "monthly", priority: 0.8 },
  frameworks: { changefreq: "monthly", priority: 0.8 },
  alternatives: { changefreq: "monthly", priority: 0.8 },
  "cli-reference": { changefreq: "monthly", priority: 0.7 },
  "migration-guides": { changefreq: "yearly", priority: 0.7 },
  "domain-guides": { changefreq: "yearly", priority: 0.7 },
  errors: { changefreq: "yearly", priority: 0.6 },
  learn: { changefreq: "yearly", priority: 0.6 },
  legal: { changefreq: "yearly", priority: 0.3 },
};


export const STATIC_PAGES = ["/", "/docs", "/free-nextjs-hosting", "/free-postgres-hosting", "/vercel-alternative", "/guides/deploy-nextjs-with-ai-agents"];

const GENERATED_FILES = ["/sitemap.xml", "/llms.txt", "/llms-index.json", "/skill.md"];
const NAV_LINKS = ["/", "/frameworks", "/guides", "/docs"];
const BANNED_CHARACTERS = new RegExp("[\\u2014\\u2190-\\u21ff]");
const root = process.cwd();
const limitsFile = path.join(root, "..", "server", "src", "lib", "limits.ts");

const readLimits = () => {
  const source = readFileSync(limitsFile, "utf8");
  const limits = {};
  for (const [, key, value] of source.matchAll(/(\w+):\s*(\d+)/g)) {
    limits[key] = Number(value);
  }
  for (const key of ["projects", "apps", "concurrentBuilds", "projectMembers", "aiPromptsPerDay"]) {
    if (limits[key] === undefined) {
      throw new Error(`${limitsFile} does not define ${key}`);
    }
  }
  return limits;
};

const walk = (dir) => {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return walk(full);
    }
    return [full];
  });
};

const pageHtml = (page) => {
  const faq = page.faq.map((item) => inline(item.a)).join("\n");
  const crumbs = page.crumbs.map((crumb) => `<a href="${crumb.path}">`).join("");
  return `${inline(page.lead)}\n${renderMarkdown(page.body).html}\n${faq}\n${crumbs}`;
};

const validate = (pages) => {
  const problems = [];
  const findDuplicates = (field) => {
    const seen = new Map();
    for (const page of pages) {
      if (seen.has(page[field])) {
        problems.push(`Duplicate ${field} on ${page.path} and ${seen.get(page[field])}`);
      }
      seen.set(page[field], page.path);
    }
  };
  findDuplicates("path");
  findDuplicates("title");
  findDuplicates("description");

  const publicDir = path.join(root, "public");
  const assets = new Set(walk(publicDir).map((file) => `/${path.relative(publicDir, file).split(path.sep).join("/")}`));
  const known = new Set([...STATIC_PAGES, ...GENERATED_FILES, ...pages.map((page) => page.path)]);
  const footerLinks = FOOTER_COLUMNS.flatMap((column) => column.links.map(([href]) => href)).filter((href) => href.startsWith("/"));
  const inbound = new Map();

  for (const page of pages) {
    if (STATIC_PAGES.includes(page.path)) {
      problems.push(`${page.path} would overwrite a hand-written page`);
    }
    const linked = [...pageHtml(page).matchAll(/href="(\/[^"#?]*)/g)].map((match) => match[1]);
    for (const target of linked) {
      if (!known.has(target) && !assets.has(target) && target !== `${page.path}.md`) {
        problems.push(`${page.path} links to missing page ${target}`);
      }
    }
    for (const target of [...linked, ...footerLinks, ...NAV_LINKS]) {
      if (target !== page.path) {
        inbound.set(target, (inbound.get(target) ?? 0) + 1);
      }
    }
    if (BANNED_CHARACTERS.test(renderPageMarkdown(page)) || BANNED_CHARACTERS.test(page.title + page.description)) {
      problems.push(`${page.path} contains an em dash or arrow`);
    }
    if (page.description.length > 180) {
      problems.push(`${page.path} description is ${page.description.length} characters`);
    }
    if (!HELD_BACK_FAMILIES.has(page.family) && !SITEMAP_RULES[page.family]) {
      problems.push(`SITEMAP_RULES in marketing/src/seo/site.mjs has no entry for family ${page.family}`);
    }
  }

  for (const href of footerLinks) {
    if (!known.has(href) && !assets.has(href)) {
      problems.push(`Footer links to missing page ${href}`);
    }
  }

  for (const page of pages) {
    if (!inbound.has(page.path)) {
      problems.push(`${page.path} has no inbound links`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Marketing build failed with ${problems.length} problems:\n${problems.join("\n")}`);
  }
};

let cached;

export const sitePages = () => {
  if (!cached) {
    cached = buildPages(readLimits());
    validate(cached);
  }
  return cached;
};

export const renderPageMarkdown = (page) => {
  const faq = page.faq.map((item) => `### ${item.q}\n\n${item.a}`).join("\n\n");
  let faqSection = "";
  if (faq) {
    faqSection = `\n\n## Frequently asked questions\n\n${faq}`;
  }
  return `# ${page.h1}\n\n${page.lead}\n\n${page.body}${faqSection}\n`;
};

export const sitemapXml = () => {
  const entries = [
    ...STATIC_PAGES.map((pagePath) => {
      if (pagePath === "/") {
        return { path: pagePath, changefreq: "monthly", priority: 1 };
      }
      return { path: pagePath, ...SITEMAP_RULES.core };
    }),
    ...sitePages()
      .filter((page) => !HELD_BACK_FAMILIES.has(page.family))
      .map((page) => {
        return { path: page.path, ...SITEMAP_RULES[page.family] };
      }),
  ].sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path));
  const urls = entries
    .map((item) => `  <url><loc>${absolute(item.path)}</loc><lastmod>${UPDATED}</lastmod><changefreq>${item.changefreq}</changefreq><priority>${item.priority.toFixed(1)}</priority></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

export const llmsIndexJson = () => {
  return JSON.stringify(
    sitePages().map((page) => {
      return { path: page.path, markdown: `${page.path}.md`, family: page.family, title: page.h1, description: page.description, lastmod: UPDATED };
    }),
  );
};

export const llmsTxt = () => {
  const head = readFileSync(path.join(root, "src", "seo", "llms.md"), "utf8").trimEnd();
  return `${head}

## Generated guides

Every generated page has a Markdown copy at the same path with \`.md\` appended. The full list is at ${SITE}/llms-index.json.

- [Frameworks](${SITE}/frameworks): Guides for each framework
- [Products](${SITE}/products): What is included
- [Pricing and limits](${SITE}/pricing): Every limit and AI Token prices
- [CLI reference](${SITE}/docs/cli): One page per command
- [Deployment errors](${SITE}/errors): Error messages and fixes
- [Migration guides](${SITE}/migrate): Moving apps and data to EasyHost
- [Concepts](${SITE}/learn): Short explanations
`;
};
