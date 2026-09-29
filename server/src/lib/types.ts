import type { AuthUser } from "./auth.js";

export type UserEnv = {
  Variables: {
    user: AuthUser;
    projectId: string;
  };
};

export type ApiKeyEnv = {
  Variables: {
    projectId: string;
  };
};
