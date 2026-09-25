import { createHash, randomBytes } from "node:crypto";

export const API_KEY_PREFIX = "eh_";

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

export const generateApiKey = () => {
  const key = `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 10), hash: hashApiKey(key) };
};
