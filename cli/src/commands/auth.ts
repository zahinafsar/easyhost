import { input, password } from "@inquirer/prompts";
import { request } from "../lib/api.js";
import { clearConfig, readConfig, writeConfig } from "../lib/config.js";
import { log } from "../lib/ui.js";

export const login = async (options: { api?: string }) => {
  const current = readConfig();
  const apiUrl = (options.api ?? current.apiUrl).replace(/\/$/, "");
  writeConfig({ apiUrl });

  const email = await input({ message: "Email" });
  const secret = await password({ message: "Password", mask: "*" });

  const { token, user } = await request<{ token: string; user: { name: string; email: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: secret }),
  });

  writeConfig({ apiUrl, token });
  log.success(`Logged in as ${user.name} <${user.email}>`);
};

export const logout = () => {
  clearConfig();
  log.success("Logged out");
};

export const whoami = async () => {
  const { user } = await request<{ user: { name: string; email: string } }>("/auth/me");
  log.info(`${user.name} <${user.email}>`);
  log.dim(readConfig().apiUrl);
};
