import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { validate } from "../lib/validator.js";
import { tokenCheckoutSchema } from "../lib/validations.js";
import { MIN_TOKENS_TO_BUILD, TOKEN_PACKS, findPack } from "../lib/tokens.js";
import { createTokenCheckout, processTokenOrder, verifyLemonSignature } from "../lib/lemonsqueezy.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";

export const tokenRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    const userId = c.get("user").id;
    const [account, purchases, usage] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { tokenBalance: true, freeAiAppUsed: true, freeAiBuildUsed: true },
      }),
      prisma.tokenPurchase.findMany({
        where: { userId, status: "PAID" },
        select: { id: true, tokens: true, amountCents: true, paidAt: true },
        orderBy: { paidAt: "desc" },
        take: 50,
      }),
      prisma.tokenUsage.findMany({
        where: { userId },
        select: { id: true, appId: true, appName: true, free: true, tokens: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return c.json({
      balance: account.tokenBalance,
      freeAppAvailable: !account.freeAiAppUsed,
      freeBuildAvailable: !account.freeAiBuildUsed,
      minTokensToBuild: MIN_TOKENS_TO_BUILD,
      packs: TOKEN_PACKS,
      purchases,
      usage,
    });
  })
  .get("/purchases/:id", async (c) => {
    const purchase = await prisma.tokenPurchase.findFirst({
      where: { id: c.req.param("id"), userId: c.get("user").id },
      select: { id: true, tokens: true, status: true },
    });
    if (!purchase) {
      return c.json({ error: "Purchase not found" }, 404);
    }
    return c.json({ purchase });
  })
  .post("/checkout", validate("json", tokenCheckoutSchema), async (c) => {
    const user = c.get("user");
    const pack = findPack(c.req.valid("json").pack);
    if (!pack) {
      return c.json({ error: "Choose a token pack" }, 400);
    }

    const purchase = await prisma.tokenPurchase.create({
      data: { userId: user.id, tokens: pack.tokens, amountCents: pack.cents },
      select: { id: true, tokens: true, amountCents: true },
    });
    const checkout = await createTokenCheckout(purchase, user);
    if (!checkout) {
      await prisma.tokenPurchase.delete({ where: { id: purchase.id } });
      return c.json({ error: "Could not start checkout. Try again." }, 502);
    }
    await prisma.tokenPurchase.update({ where: { id: purchase.id }, data: { lsCheckoutId: checkout.id } });
    return c.json({ url: checkout.url });
  });

type LsOrderPayload = {
  meta?: { event_name?: string; custom_data?: Record<string, string>; webhook_id?: string };
  data?: { id?: string; attributes?: { status?: string } };
};

export const lemonSqueezyWebhookRoutes = new Hono().post("/", async (c) => {
  const raw = await c.req.text();
  if (!verifyLemonSignature(raw, c.req.header("x-signature"))) {
    return c.json({ error: "Invalid signature" }, 400);
  }

  let body: LsOrderPayload;
  try {
    body = JSON.parse(raw);
  } catch {
    return c.json({ error: "Bad JSON" }, 400);
  }

  if (c.req.header("x-event-name") !== "order_created") {
    return c.json({ received: true });
  }

  const lsOrderId = body.data?.id;
  const purchaseId = body.meta?.custom_data?.purchase_id;
  if (!lsOrderId || body.data?.attributes?.status !== "paid" || !purchaseId) {
    return c.json({ received: true });
  }

  try {
    const result = await processTokenOrder(String(lsOrderId), purchaseId, `${body.meta?.webhook_id ?? ""}-${lsOrderId}`);
    if (!result.ok) {
      console.error("[lemonsqueezy webhook] token purchase not processed", { lsOrderId, purchaseId, reason: result.reason });
    }
  } catch (error) {
    console.error("[lemonsqueezy webhook] handler failed", error);
    return c.json({ error: "Handler failed" }, 500);
  }
  return c.json({ received: true });
});
