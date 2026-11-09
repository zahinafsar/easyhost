import { createHmac, timingSafeEqual } from "node:crypto";
import { createCheckout, getOrder, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { prisma } from "./prisma.js";
import { env } from "./env.js";

lemonSqueezySetup({
  apiKey: env.lemonSqueezy.apiKey,
  onError: (error) => console.error("[lemonsqueezy]", error),
});

export const verifyLemonSignature = (rawBody: string, signature: string | undefined) => {
  if (!signature || !/^[0-9a-f]+$/i.test(signature)) {
    return false;
  }
  const expected = createHmac("sha256", env.lemonSqueezy.webhookSecret).update(rawBody).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
};

export const createTokenCheckout = async (purchase: { id: string; tokens: number; amountCents: number }, user: { id: string; email: string }) => {
  const { data, error } = await createCheckout(env.lemonSqueezy.storeId, env.lemonSqueezy.variantId, {
    testMode: !env.isProduction,
    customPrice: purchase.amountCents,
    productOptions: {
      name: `${purchase.tokens.toLocaleString("en-US")} EasyHost tokens`,
      description: "Tokens for the EasyHost AI builder. One-time purchase, tokens never expire.",
      redirectUrl: `${env.appUrl}/tokens?purchase=${purchase.id}`,
      receiptButtonText: "Back to EasyHost",
      receiptLinkUrl: `${env.appUrl}/tokens`,
    },
    checkoutOptions: {
      embed: false,
      media: false,
      logo: true,
    },
    checkoutData: {
      email: user.email,
      custom: {
        purchase_id: purchase.id,
        user_id: user.id,
      },
    },
  });
  if (error || !data) {
    console.error("Lemon Squeezy createCheckout failed", error);
    return null;
  }
  return { id: data.data.id, url: data.data.attributes.url };
};

type ProcessResult = { ok: true; alreadyProcessed: boolean } | { ok: false; reason: string };

export const processTokenOrder = async (lsOrderId: string, purchaseId: string, lsEventId: string): Promise<ProcessResult> => {
  const { data: order, error } = await getOrder(lsOrderId);
  if (error || !order) {
    return { ok: false, reason: "ls-order-not-found" };
  }
  const attrs = order.data.attributes;
  if (attrs.status !== "paid") {
    return { ok: false, reason: "not-paid" };
  }
  if (String(attrs.store_id) !== env.lemonSqueezy.storeId) {
    return { ok: false, reason: "store-mismatch" };
  }
  if (String(attrs.first_order_item?.variant_id) !== env.lemonSqueezy.variantId) {
    return { ok: false, reason: "variant-mismatch" };
  }
  if (attrs.currency && attrs.currency.toLowerCase() !== "usd") {
    return { ok: false, reason: "currency-mismatch" };
  }

  const purchase = await prisma.tokenPurchase.findUnique({ where: { id: purchaseId } });
  if (!purchase) {
    return { ok: false, reason: "purchase-not-found" };
  }
  if (purchase.status === "PAID") {
    if (purchase.lsOrderId === lsOrderId) {
      return { ok: true, alreadyProcessed: true };
    }
    return { ok: false, reason: "purchase-bound-to-other-order" };
  }

  const reused = await prisma.tokenPurchase.findFirst({
    where: { lsOrderId, id: { not: purchase.id } },
    select: { id: true },
  });
  if (reused) {
    return { ok: false, reason: "order-already-used" };
  }

  const orderCreatedAt = new Date(attrs.created_at).getTime();
  if (Number.isFinite(orderCreatedAt) && orderCreatedAt < purchase.createdAt.getTime() - 60_000) {
    return { ok: false, reason: "order-predates-purchase" };
  }

  const paidCents = Number(attrs.subtotal) - Number(attrs.discount_total ?? 0);
  if (!Number.isFinite(paidCents) || paidCents < purchase.amountCents) {
    return { ok: false, reason: "amount-mismatch" };
  }

  const credited = await prisma.$transaction(async (tx) => {
    const { count } = await tx.tokenPurchase.updateMany({
      where: { id: purchase.id, status: "PENDING" },
      data: { status: "PAID", lsOrderId, lsEventId, paidAt: new Date() },
    });
    if (!count) {
      return false;
    }
    await tx.user.update({ where: { id: purchase.userId }, data: { tokenBalance: { increment: purchase.tokens } } });
    return true;
  });
  return { ok: true, alreadyProcessed: !credited };
};
