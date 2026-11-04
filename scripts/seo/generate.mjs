import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { footerHtml, HELD_BACK_FAMILIES, renderPage, renderPageMarkdown, SITE, UPDATED } from "./layout.mjs";
import { buildPages } from "./pages.mjs";

const BANNED_CHARACTERS = new RegExp("[\\u2014\\u2190-\\u21ff]");

const [outDir, limitsFile] = process.argv.slice(2);

if (!outDir || !limitsFile) {
  throw new Error("Usage: node generate.mjs <marketing output dir> <path to server/src/lib/limits.ts>");
}

const readLimits = (file) => {
  const source = readFileSync(file, "utf8");
  const limits = {};
  for (const [, key, value] of source.matchAll(/(\w+):\s*(\d+)/g)) {
    limits[key] = Number(value);
  }
  for (const key of ["projects", "apps", "schedules", "emailSenders", "emailsPerDay", "concurrentBuilds", "projectMembers", "aiPromptsPerDay"]) {
    if (limits[key] === undefined) {
      throw new Error(`${file} does not define ${key}`);
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

const pagePathFromFile = (file) => {
  const relative = path.relative(outDir, file).split(path.sep).join("/");
  if (relative === "index.html") {
    return "/";
  }
  return `/${relative.replace(/\/index\.html$/, "")}`;
};

const write = (relative, content) => {
  const full = path.join(outDir, relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
};

const manifestPath = path.join(outDir, "llms-index.json");
let previouslyGenerated = new Set();
if (existsSync(manifestPath)) {
  previouslyGenerated = new Set(JSON.parse(readFileSync(manifestPath, "utf8")).map((page) => page.path));
}

const allHtml = walk(outDir).filter((file) => file.endsWith(".html"));
const staticHtml = allHtml.filter((file) => !previouslyGenerated.has(pagePathFromFile(file)));
const staticPages = staticHtml.filter((file) => !file.endsWith("404.html")).map(pagePathFromFile);
const pages = buildPages(readLimits(limitsFile));
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

const rendered = pages.map((page) => {
  if (staticPages.includes(page.path)) {
    problems.push(`${page.path} would overwrite a hand-written page`);
  }
  return { page, html: renderPage(page), markdown: renderPageMarkdown(page) };
});

const known = new Set([...staticPages, ...pages.map((page) => page.path)]);
const assetFiles = new Set(walk(outDir).map((file) => `/${path.relative(outDir, file).split(path.sep).join("/")}`));
const inbound = new Map();

for (const { page, html, markdown } of rendered) {
  for (const [, target] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    if (!known.has(target) && !assetFiles.has(target) && target !== "/skill.md" && target !== `${page.path}.md`) {
      problems.push(`${page.path} links to missing page ${target}`);
    }
    if (target !== page.path) {
      inbound.set(target, (inbound.get(target) ?? 0) + 1);
    }
  }
  if (BANNED_CHARACTERS.test(markdown) || BANNED_CHARACTERS.test(page.title + page.description)) {
    problems.push(`${page.path} contains an em dash or arrow`);
  }
  if (page.description.length > 180) {
    problems.push(`${page.path} description is ${page.description.length} characters`);
  }
}

for (const page of pages) {
  if (!inbound.has(page.path)) {
    problems.push(`${page.path} has no inbound links`);
  }
}

if (problems.length > 0) {
  throw new Error(`SEO build failed with ${problems.length} problems:\n${problems.join("\n")}`);
}

for (const { page, html, markdown } of rendered) {
  write(`${page.path.slice(1)}/index.html`, html);
  write(`${page.path.slice(1)}.md`, markdown);
}

for (const file of staticHtml) {
  const source = readFileSync(file, "utf8");
  writeFileSync(file, source.replace(/<footer class="footer">[\s\S]*?<\/footer>/, footerHtml()));
}

const families = new Map();
for (const page of pages.filter((item) => !HELD_BACK_FAMILIES.has(item.family))) {
  families.set(page.family, [...(families.get(page.family) ?? []), page.path]);
}
families.set("core", staticPages);

const urlFor = (pagePath) => {
  if (pagePath === "/") {
    return `${SITE}/`;
  }
  return `${SITE}${pagePath}`;
};

rmSync(path.join(outDir, "sitemaps"), { recursive: true, force: true });

const sitemapEntries = [];
for (const [family, paths] of families) {
  const urls = paths.map((pagePath) => `  <url><loc>${urlFor(pagePath)}</loc><lastmod>${UPDATED}</lastmod></url>`).join("\n");
  write(`sitemaps/${family}.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  sitemapEntries.push(`  <sitemap><loc>${SITE}/sitemaps/${family}.xml</loc><lastmod>${UPDATED}</lastmod></sitemap>`);
}
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.join("\n")}\n</sitemapindex>\n`);

write(
  "llms-index.json",
  JSON.stringify(
    pages.map((page) => {
      return { path: page.path, markdown: `${page.path}.md`, family: page.family, title: page.h1, description: page.description, lastmod: UPDATED };
    }),
  ),
);

const llmsPath = path.join(outDir, "llms.txt");
if (!existsSync(llmsPath)) {
  throw new Error(`${llmsPath} is missing`);
}
writeFileSync(
  llmsPath,
  `${readFileSync(llmsPath, "utf8").split("## Generated guides")[0].trimEnd()}

## Generated guides

Every generated page has a Markdown copy at the same path with \`.md\` appended. The full list is at ${SITE}/llms-index.json.

- [Frameworks](${SITE}/frameworks): Guides for each framework
- [Products](${SITE}/products): What is included
- [Pricing and limits](${SITE}/pricing): Every limit
- [CLI reference](${SITE}/docs/cli): One page per command
- [Deployment errors](${SITE}/errors): Error messages and fixes
- [Migration guides](${SITE}/migrate): Moving apps and data to EasyHost
- [Concepts](${SITE}/learn): Short explanations
`,
);

const heldBack = pages.filter((page) => HELD_BACK_FAMILIES.has(page.family)).length;
process.stdout.write(`Generated ${pages.length} pages: ${pages.length - heldBack} indexable, ${heldBack} noindex, ${families.size} sitemaps\n`);
