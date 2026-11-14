const publicApiUrl = import.meta.env.VITE_PUBLIC_API_URL;

if (!publicApiUrl?.trim()) {
  throw new Error("Missing required environment variable: VITE_PUBLIC_API_URL");
}

const marketingUrl = import.meta.env.VITE_MARKETING_URL;

if (!marketingUrl?.trim()) {
  throw new Error("Missing required environment variable: VITE_MARKETING_URL");
}

export const env = {
  publicApiUrl,
  marketingUrl,
};
