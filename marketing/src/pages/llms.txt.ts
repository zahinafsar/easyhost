import { llmsTxt } from "../seo/site.mjs";

export const GET = () => {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
