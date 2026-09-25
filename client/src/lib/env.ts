const publicApiUrl = import.meta.env.VITE_PUBLIC_API_URL;

if (!publicApiUrl?.trim()) {
  throw new Error("Missing required environment variable: VITE_PUBLIC_API_URL");
}

export const env = {
  publicApiUrl,
};
