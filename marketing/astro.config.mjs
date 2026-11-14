import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import { renderPageMarkdown, SITE, sitePages } from "./src/seo/site.mjs";

const markdownCopies = {
  name: "markdown-copies",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const outDir = fileURLToPath(dir);
      for (const page of sitePages()) {
        const file = path.join(outDir, `${page.path.slice(1)}.md`);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, renderPageMarkdown(page));
      }
    },
  },
};

export default defineConfig({
  site: SITE,
  trailingSlash: "never",
  build: { format: "directory" },
  compressHTML: false,
  integrations: [markdownCopies],
});
