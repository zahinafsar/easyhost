import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { MIN_TOKENS_TO_BUILD } from "../lib/tokens.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";

export const tokenRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const account = await prisma.user.findUniqueOrThrow({
      where: { id: c.get("user").id },
      select: { tokenBalance: true, freeAiAppUsed: true, freeAiBuildUsed: true },
    });
    return c.json({
      balance: account.tokenBalance,
      freeAppAvailable: !account.freeAiAppUsed,
      freeBuildAvailable: !account.freeAiBuildUsed,
      minTokensToBuild: MIN_TOKENS_TO_BUILD,
    });
  });
