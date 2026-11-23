import { createHmac, timingSafeEqual } from "node:crypto";
import { createCheckout, getSubscription, lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import type { SubscriptionStatus } from "@prisma/client";
import { env } from "./env.js";
import type { PaymentEvent, PaymentProvider, ProviderSubscription } from "./payments.js";

lemonSqueezySetup({
  apiKey: env.lemonSqueezy.apiKey,
  onError: (error) => console.error("[lemonsqueezy]", error),
});

const verifySignature = (rawBody: string, signature: string | undefined) => {
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

const mapStatus = (status: string): SubscriptionStatus => {
  if (status === "active" || status === "on_trial") {
    return "ACTIVE";
  }
  if (status === "cancelled") {
    return "CANCELLED";
  }
  if (status === "expired") {
    return "EXPIRED";
  }
  return "PAST_DUE";
};

const toDate = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

type LsSubscription = {
  id?: string | number;
  attributes?: {
    store_id?: number;
    variant_id?: number;
    status?: string;
    renews_at?: string | null;
    ends_at?: string | null;
    urls?: { customer_portal?: string | null } | null;
  };
};

const toSubscription = (data: LsSubscription): ProviderSubscription | null => {
  const attrs = data.attributes;
  if (!data.id || !attrs) {
    return null;
  }
  if (String(attrs.store_id) !== env.lemonSqueezy.storeId || String(attrs.variant_id) !== env.lemonSqueezy.variantId) {
    return null;
  }
  return {
    providerSubscriptionId: String(data.id),
    status: mapStatus(attrs.status ?? ""),
    renewsAt: toDate(attrs.renews_at),
    endsAt: toDate(attrs.ends_at),
    portalUrl: attrs.urls?.customer_portal ?? null,
  };
};

type LsWebhook = {
  meta?: { event_name?: string; custom_data?: Record<string, string> };
  data?: LsSubscription & { attributes?: { subscription_id?: number; billing_reason?: string; status?: string } };
};

const parseWebhook = (rawBody: string, headers: Record<string, string | undefined>): PaymentEvent | null => {
  if (!verifySignature(rawBody, headers["x-signature"])) {
    return null;
  }
  let body: LsWebhook;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const eventName = body.meta?.event_name ?? headers["x-event-name"] ?? "";
  const data = body.data ?? {};

  if (eventName === "subscription_payment_success") {
    const subscriptionId = data.attributes?.subscription_id;
    if (!subscriptionId || data.attributes?.billing_reason !== "renewal" || data.attributes?.status !== "paid") {
      return { type: "ignored" };
    }
    return { type: "subscription.renewed", providerSubscriptionId: String(subscriptionId), paymentId: String(data.id) };
  }
  if (eventName === "subscription_payment_failed") {
    const subscriptionId = data.attributes?.subscription_id;
    if (!subscriptionId) {
      return { type: "ignored" };
    }
    return { type: "subscription.payment_failed", providerSubscriptionId: String(subscriptionId) };
  }
  if (!eventName.startsWith("subscription_")) {
    return { type: "ignored" };
  }
  const subscription = toSubscription(data);
  if (!subscription) {
    return { type: "ignored" };
  }
  if (eventName === "subscription_created") {
    return { type: "subscription.created", userId: body.meta?.custom_data?.user_id ?? null, subscription };
  }
  return { type: "subscription.updated", subscription };
};

export const lemonSqueezyProvider: PaymentProvider = {
  name: "lemonsqueezy",
  createSubscriptionCheckout: async (user, redirectUrl) => {
    const { data, error } = await createCheckout(env.lemonSqueezy.storeId, env.lemonSqueezy.variantId, {
      testMode: !env.isProduction,
      productOptions: {
        redirectUrl,
        receiptButtonText: "Back to EasyHost",
        receiptLinkUrl: `${env.appUrl}/subscription`,
      },
      checkoutOptions: {
        embed: false,
        media: false,
        logo: true,
      },
      checkoutData: {
        email: user.email,
        custom: {
          user_id: user.id,
        },
      },
    });
    if (error || !data) {
      console.error("Lemon Squeezy createCheckout failed", error);
      return null;
    }
    return { url: data.data.attributes.url };
  },
  fetchSubscription: async (providerSubscriptionId) => {
    const { data, error } = await getSubscription(providerSubscriptionId);
    if (error || !data) {
      return null;
    }
    return toSubscription(data.data as unknown as LsSubscription);
  },
  parseWebhook,
};
