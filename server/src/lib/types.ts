import type { AuthUser } from "./auth.js";

export type UserEnv = {
  Variables: {
    user: AuthUser;
  };
};

export type ApiKeyEnv = {
  Variables: {
    userId: string;
  };
};
