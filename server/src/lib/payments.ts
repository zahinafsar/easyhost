import type { SubscriptionStatus } from "@prisma/client";
import { lemonSqueezyProvider } from "./lemonsqueezy.js";

export type ProviderSubscription = {
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  renewsAt: Date | null;
  endsAt: Date | null;
  portalUrl: string | null;
};

export type PaymentEvent =
  | { type: "subscription.created"; userId: string | null; subscription: ProviderSubscription }
  | { type: "subscription.updated"; subscription: ProviderSubscription }
  | { type: "subscription.renewed"; providerSubscriptionId: string; paymentId: string }
  | { type: "subscription.payment_failed"; providerSubscriptionId: string }
  | { type: "ignored" };

export type PaymentProvider = {
  name: string;
  createSubscriptionCheckout: (user: { id: string; email: string }, redirectUrl: string) => Promise<{ url: string } | null>;
  fetchSubscription: (providerSubscriptionId: string) => Promise<ProviderSubscription | null>;
  parseWebhook: (rawBody: string, headers: Record<string, string | undefined>) => PaymentEvent | null;
};

export const payments: PaymentProvider = lemonSqueezyProvider;
