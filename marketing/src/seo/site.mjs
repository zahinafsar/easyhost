import { readdirSync, readFileSync, statSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { inline, renderMarkdown } from "./markdown.mjs";
import { buildPages } from "./pages.mjs";

export const SITE = "https://reverhost.com";
export const UPDATED = "2026-11-25";
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
      ["/products/app-hosting", "App hosting"],
      ["/products/postgres", "Postgres database"],
      ["/products/storage", "S3 storage"],
      ["/products/custom-domains", "Custom domains"],
      ["/languages", "Dockerfile templates"],
      ["/products/cli", "ezhst CLI"],
      ["/products/agent-skill", "Agent skill"],
      ["/products/ai-builder", "AI Builder"],
      ["/products/team-members", "Team members"],
      ["/pricing", "Pricing and limits"],
    ],
  },
  {
    title: "Languages",
    links: [
      ["/languages/nodejs", "Node.js"],
      ["/languages/bun", "Bun"],
      ["/languages/python", "Python"],
      ["/languages/go", "Go"],
      ["/languages/ruby", "Ruby"],
      ["/languages/php", "PHP"],
      ["/languages/rust", "Rust"],
      ["/languages/zig", "Zig"],
      ["/languages", "All languages"],
    ],
  },
  {
    title: "Frameworks",
    links: [
      ["/free-nextjs-hosting", "Next.js"],
      ["/free-nuxt-hosting", "Nuxt"],
      ["/free-express-hosting", "Express"],
      ["/free-nestjs-hosting", "NestJS"],
      ["/free-fastapi-hosting", "FastAPI"],
      ["/free-django-hosting", "Django"],
      ["/free-laravel-hosting", "Laravel"],
      ["/free-rails-hosting", "Rails"],
      ["/free-gin-hosting", "Gin"],
      ["/free-axum-hosting", "Axum"],
      ["/frameworks", "All frameworks"],
    ],
  },
  {
    title: "Guides",
    links: [
      ["/guides/deploy-nextjs-with-ai-agents", "Deploy with AI agents"],
      ["/guides/write-a-dockerfile", "Write a Dockerfile"],
      ["/guides/build-time-environment-variables", "Build-time env vars"],
      ["/guides/deploy-python-with-postgres", "Python with Postgres"],
      ["/guides/deploy-rust-or-go-binary", "Rust or Go binary"],
      ["/guides/nextjs-prisma-postgres", "Next.js with Prisma"],
      ["/migrate/postgres", "Move a Postgres database"],
      ["/migrate/storage", "Move S3 files"],
      ["/guides/custom-domain-cloudflare", "Cloudflare custom domain"],
      ["/guides", "All guides"],
    ],
  },
  {
    title: "Switch from",
    links: [
      ["/vercel-alternative", "Vercel"],
      ["/render-alternative", "Render"],
      ["/railway-alternative", "Railway"],
      ["/heroku-alternative", "Heroku"],
      ["/fly-alternative", "Fly.io"],
      ["/alternatives", "All comparisons"],
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
    ],
  },
];

export const FOOTER_LEGAL = [
  ["mailto:hello@reverhost.com", "Contact"],
  ["/privacy", "Privacy policy"],
  ["/terms", "Terms and conditions"],
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
  const organization = { "@type": "Organization", name: "Reverhost", url: `${SITE}/` };
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
  languages: { changefreq: "monthly", priority: 0.8 },
  "dockerfile-guides": { changefreq: "monthly", priority: 0.7 },
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
const plansFile = path.join(root, "..", "server", "src", "lib", "plans.ts");
const templatesFile = path.join(root, "..", "server", "src", "lib", "dockerfile-templates.ts");

export const readTemplates = () => {
  const code = stripTypeScriptTypes(readFileSync(templatesFile, "utf8")).replace(/^export /gm, "");
  const templates = new Function(`${code}\nreturn DOCKERFILE_TEMPLATES;`)();
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new Error(`${templatesFile} does not define DOCKERFILE_TEMPLATES`);
  }
  return templates;
};

const readLimits = () => {
  const source = readFileSync(limitsFile, "utf8");
  const limits = {};
  for (const [, key, value] of source.matchAll(/(\w+):\s*(\d+)/g)) {
    limits[key] = Number(value);
  }
  for (const key of ["concurrentBuilds", "projectMembers", "aiPromptsPerDay"]) {
    if (limits[key] === undefined) {
      throw new Error(`${limitsFile} does not define ${key}`);
    }
  }
  const product = (key) => {
    const match = new RegExp(`${key}:\\s*([\\d_\\s*]+),`).exec(source);
    if (!match) {
      throw new Error(`${limitsFile} does not define ${key}`);
    }
    return match[1].split("*").reduce((total, part) => total * Number(part.trim().replaceAll("_", "")), 1);
  };
  const MB = 1024 * 1024;
  limits.appMemoryMb = product("appMemoryBytes") / MB;
  limits.appCpus = product("appNanoCpus") / 1e9;
  limits.maxImageGb = product("maxImageBytes") / (MB * 1024);
  const plans = readFileSync(plansFile, "utf8");
  const block = (name) => {
    const match = new RegExp(`export const ${name}: Plan = \\{([^}]*)\\}`).exec(plans);
    if (!match) {
      throw new Error(`${plansFile} does not define ${name}`);
    }
    return match[1];
  };
  const pick = (source, pattern, name) => {
    const match = pattern.exec(source);
    if (!match) {
      throw new Error(`${plansFile} does not define ${name}`);
    }
    return Number(match[1]);
  };
  const free = block("FREE");
  const pro = block("PRO");
  limits.projects = pick(free, /projects:\s*(\d+)/, "FREE.projects");
  limits.apps = pick(free, /apps:\s*(\d+)/, "FREE.apps");
  limits.dbMb = pick(free, /dbBytes:\s*(\d+)\s*\*\s*MB/, "FREE.dbBytes");
  limits.storageMb = pick(free, /storageBytes:\s*(\d+)\s*\*\s*MB/, "FREE.storageBytes");
  limits.proProjects = pick(pro, /projects:\s*(\d+)/, "PRO.projects");
  limits.proPrice = pick(pro, /price:\s*(\d+)/, "PRO.price");
  limits.proTokens = pick(pro, /monthlyTokens:\s*(\d+)/, "PRO.monthlyTokens");
  limits.buildsPerDay = pick(free, /buildsPerDay:\s*(\d+)/, "FREE.buildsPerDay");
  limits.proBuildsPerDay = pick(pro, /buildsPerDay:\s*(\d+)/, "PRO.buildsPerDay");
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
  const tiles = (page.tiles ?? []).map((tile) => `<a href="${tile.href}">`).join("");
  return `${inline(page.lead)}\n${renderMarkdown(page.body).html}\n${faq}\n${crumbs}\n${tiles}`;
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
  const footerLinks = [...FOOTER_COLUMNS.flatMap((column) => column.links), ...FOOTER_LEGAL].map(([href]) => href).filter((href) => href.startsWith("/"));
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
    const icons = [page.icon, ...(page.tiles ?? []).map((tile) => tile.src)].filter(Boolean);
    for (const icon of icons) {
      if (!assets.has(icon)) {
        problems.push(`${page.path} uses missing icon ${icon}`);
      }
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
    cached = buildPages(readLimits(), readTemplates());
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

- [Languages](${SITE}/languages): Starter Dockerfiles and hosting notes for Node.js, Bun, Python, Go, Ruby, PHP, Rust and Zig
- [Frameworks](${SITE}/frameworks): Guides for each framework
- [Guides](${SITE}/guides): Dockerfiles, build-time env vars, databases, storage and domains
- [Products](${SITE}/products): What is included
- [Pricing and limits](${SITE}/pricing): Every limit and AI Token prices
- [CLI reference](${SITE}/docs/cli): One page per command
- [Deployment errors](${SITE}/errors): Error messages and fixes
- [Migration guides](${SITE}/migrate): Moving apps and data to Reverhost
- [Concepts](${SITE}/learn): Short explanations
`;
};
