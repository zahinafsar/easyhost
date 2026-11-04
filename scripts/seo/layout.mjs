import { escapeHtml, inline, renderMarkdown } from "./markdown.mjs";

export const SITE = "https://easyhost.fun";
export const UPDATED = "2026-10-31";

export const HELD_BACK_FAMILIES = new Set([
  "agent-guides",
  "package-manager-guides",
  "database-guides",
  "storage-guides",
  "email-guides",
  "schedule-guides",
  "env-guides",
  "monorepo-guides",
  "migration-framework-guides",
]);

const FOOTER_COLUMNS = [
  {
    title: "Products",
    links: [
      ["/products/app-hosting", "Node.js hosting"],
      ["/products/postgres", "Postgres database"],
      ["/products/storage", "S3 storage"],
      ["/products/email", "Transactional email"],
      ["/products/schedules", "Cron schedules"],
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
      ["/guides/nextjs-send-email", "Send email from Next.js"],
      ["/guides/nextjs-cron-jobs", "Next.js cron jobs"],
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
    ],
  },
];

const absolute = (path) => {
  if (path === "/") {
    return `${SITE}/`;
  }
  return `${SITE}${path}`;
};

const jsonLd = (page) => {
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

const COPY_SCRIPT = `<script>
      const copyIcon = '<svg class="icon icon-copy" viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><svg class="icon icon-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
      document.querySelectorAll(".code").forEach((block) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy";
        button.setAttribute("aria-label", "Copy code");
        button.innerHTML = copyIcon;
        button.addEventListener("click", () => {
          navigator.clipboard.writeText(block.querySelector("pre").textContent).then(() => {
            button.classList.add("copied");
            setTimeout(() => {
              button.classList.remove("copied");
            }, 1500);
          });
        });
        block.appendChild(button);
      });
    </script>`;

const crumbsHtml = (page) => {
  return page.crumbs
    .map((crumb, position) => {
      if (position === page.crumbs.length - 1) {
        return `<li aria-current="page">${escapeHtml(crumb.name)}</li>`;
      }
      return `<li><a href="${crumb.path}">${escapeHtml(crumb.name)}</a></li>`;
    })
    .join("");
};

export const footerHtml = () => {
  const columns = FOOTER_COLUMNS.map((column) => {
    const links = column.links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("");
    return `<div class="footer-column"><p class="footer-title">${column.title}</p><ul>${links}</ul></div>`;
  }).join("\n          ");
  return `<footer class="footer">
      <div class="container">
        <div class="footer-brand">
          <a href="/" class="logo">
            <img src="/logo.svg" alt="" width="18" height="24" />
            EasyHost
          </a>
          <p>Free Node.js hosting with Postgres, S3 storage, email and schedules, built for AI coding agents. No credit card.</p>
        </div>
        <nav class="footer-columns" aria-label="Footer">
          ${columns}
        </nav>
        <div class="footer-bottom">
          <span>&copy; 2026 EasyHost</span>
          <code>npx ezhst skill install</code>
        </div>
      </div>
    </footer>`;
};

export const renderPage = (page) => {
  const { html, toc } = renderMarkdown(page.body);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = absolute(page.path);
  let robots = "index, follow, max-image-preview:large, max-snippet:-1";
  if (HELD_BACK_FAMILIES.has(page.family)) {
    robots = "noindex, follow";
  }
  const tocItems = toc.map((item) => `<li><a href="#${item.id}">${inline(item.title)}</a></li>`).join("");
  let faqToc = "";
  let faqHtml = "";
  if (page.faq.length > 0) {
    faqToc = '<li><a href="#faq">FAQ</a></li>';
    const entries = page.faq.map((item) => `<h3>${inline(item.q)}</h3>\n<p>${inline(item.a)}</p>`).join("\n");
    faqHtml = `<section id="faq"><h2>Frequently asked questions</h2>\n${entries}</section>`;
  }
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" type="text/markdown" href="${page.path}.md" />
    <meta name="robots" content="${robots}" />
    <meta name="theme-color" content="#ffffff" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="EasyHost" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${SITE}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${SITE}/og.png" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <script type="application/ld+json">${jsonLd(page)}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <header class="nav">
      <div class="container nav-inner">
        <a href="/" class="logo">
          <img src="/logo.svg" alt="" width="18" height="24" />
          EasyHost
        </a>
        <nav class="nav-links" aria-label="Main">
          <a href="/">Home</a>
          <a href="/frameworks">Frameworks</a>
          <a href="/guides">Guides</a>
          <a href="/docs" class="keep">Docs</a>
        </nav>
        <div class="nav-actions">
          <a href="https://app.easyhost.fun/login" class="btn btn-ghost">Log in</a>
          <a href="https://app.easyhost.fun/register" class="btn btn-primary">Sign up</a>
        </div>
      </div>
    </header>

    <div class="container docs">
      <aside class="toc">
        <p class="toc-title">On this page</p>
        <ol>${tocItems}${faqToc}</ol>
      </aside>

      <main class="doc">
        <div class="doc-head">
          <ol class="crumbs" aria-label="Breadcrumb">${crumbsHtml(page)}</ol>
          <h1>${inline(page.h1)}</h1>
          <p class="lead">${inline(page.lead)}</p>
          <p class="doc-meta">Last updated October 31, 2026</p>
        </div>
${html}
${faqHtml}
        <section id="start">
          <h2>Start for free</h2>
          <p>Install the skill, choose Global or Local, then tell your agent to deploy. No credit card, no config files.</p>
          <div class="code"><pre>npx ezhst skill install</pre></div>
          <div class="doc-cta">
            <a href="https://app.easyhost.fun/register" class="btn btn-primary">Sign up free</a>
            <a href="/docs" class="btn btn-outline">Read the docs</a>
          </div>
        </section>
      </main>
    </div>

    ${footerHtml()}
    ${COPY_SCRIPT}
  </body>
</html>
`;
};

export const renderPageMarkdown = (page) => {
  const faq = page.faq.map((item) => `### ${item.q}\n\n${item.a}`).join("\n\n");
  let faqSection = "";
  if (faq) {
    faqSection = `\n\n## Frequently asked questions\n\n${faq}`;
  }
  return `# ${page.h1}\n\n${page.lead}\n\n${page.body}${faqSection}\n`;
};
