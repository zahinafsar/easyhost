import { sitemapXml } from "../seo/site.mjs";

export const GET = () => {
  return new Response(sitemapXml(), { headers: { "Content-Type": "application/xml" } });
};
