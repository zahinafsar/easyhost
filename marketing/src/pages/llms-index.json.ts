import { llmsIndexJson } from "../seo/site.mjs";

export const GET = () => {
  return new Response(llmsIndexJson(), { headers: { "Content-Type": "application/json" } });
};
