import { input, password } from "@inquirer/prompts";
import { ApiError, json, request } from "../lib/api.js";
import { clearConfig, readConfig, writeConfig } from "../lib/config.js";
import { isInteractive, log, output, required } from "../lib/ui.js";

type User = { id: string; name: string; email: string; verified: boolean };

type Credentials = { email?: string; password?: string; api?: string };

const apiUrlFrom = (api?: string) => (api ?? readConfig().apiUrl).replace(/\/$/, "");

const askEmail = () => input({ message: "Email" });

const askPassword = () => password({ message: "Password", mask: "*" });

const saveSession = (apiUrl: string, token: string, user: User, message: string) => {
  writeConfig({ apiUrl, token });
  output({ user, token }, () => {
    log.success(`${message} ${user.name} <${user.email}>`);
    if (!user.verified && !isInteractive()) {
      log.warn("Verify your email before using EasyHost: run `ezhst verify <code>` with the 6-digit code we emailed you.");
    }
  });
};

const askForCode = async (user: User) => {
  if (user.verified || !isInteractive()) {
    return;
  }
  log.info(`We emailed a 6-digit code to ${user.email}. Enter it to finish (press Enter to skip for now).`);
  while (true) {
    const code = (await input({ message: "Verification code" })).trim();
    if (!code) {
      log.warn("Skipped. Run `ezhst verify <code>` before using other commands.");
      return;
    }
    try {
      const result = await request<{ message: string }>("/auth/verify-email", json("POST", { code }));
      log.success(result.message);
      return;
    } catch (error) {
      if (!(error instanceof ApiError)) {
        throw error;
      }
      log.error(error.message);
    }
  }
};

export const register = async (options: Credentials & { name?: string }) => {
  const apiUrl = apiUrlFrom(options.api);
  writeConfig({ apiUrl });
  const name = await required(options.name, "--name", () => input({ message: "Name" }));
  const email = await required(options.email, "--email", askEmail);
  const secret = await required(options.password, "--password", askPassword);

  const { token, user } = await request<{ token: string; user: User }>(
    "/auth/register",
    json("POST", { name, email, password: secret }),
  );
  saveSession(apiUrl, token, user, "Account created for");
  await askForCode(user);
};

export const login = async (options: Credentials) => {
  const apiUrl = apiUrlFrom(options.api);
  writeConfig({ apiUrl });
  const email = await required(options.email, "--email", askEmail);
  const secret = await required(options.password, "--password", askPassword);

  const { token, user } = await request<{ token: string; user: User }>("/auth/login", json("POST", { email, password: secret }));
  saveSession(apiUrl, token, user, "Logged in as");
  await askForCode(user);
};

export const logout = () => {
  clearConfig();
  output({ loggedOut: true }, () => log.success("Logged out"));
};

export const whoami = async () => {
  const { user } = await request<{ user: User }>("/auth/me");
  const { apiUrl } = readConfig();
  output({ user, apiUrl }, () => {
    log.info(`${user.name} <${user.email}>`);
    if (!user.verified) {
      log.warn("Email not verified. Run `ezhst verify <code>`.");
    }
    log.dim(apiUrl);
  });
};

export const verify = async (code: string) => {
  const result = await request<{ message: string }>("/auth/verify-email", json("POST", { code }));
  output(result, () => log.success(result.message));
};

export const resendVerification = async () => {
  const result = await request<{ message: string }>("/auth/resend-verification", { method: "POST" });
  output(result, () => log.success(result.message));
};

export const forgotPassword = async (options: { email?: string }) => {
  const email = await required(options.email, "--email", askEmail);
  const result = await request<{ message: string }>("/auth/forgot-password", json("POST", { email }));
  output(result, () => log.success(result.message));
};
