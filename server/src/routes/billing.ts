import { Hono } from "hono";
import { billingOverview, billingPortalUrl, handlePaymentEvent, startCheckout } from "../lib/billing.js";
import { payments } from "../lib/payments.js";
import { requireUser } from "../middleware/require-user.js";
import type { UserEnv } from "../lib/types.js";

export const billingRoutes = new Hono<UserEnv>()
  .use(requireUser)
  .get("/", async (c) => {
    return c.json(await billingOverview(c.get("user").id));
  })
  .post("/checkout", async (c) => {
    const result = await startCheckout(c.get("user"));
    if ("error" in result) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ url: result.url });
  })
  .get("/portal", async (c) => {
    const url = await billingPortalUrl(c.get("user").id);
    if (!url) {
      return c.json({ error: "No subscription yet" }, 404);
    }
    return c.json({ url });
  });

export const paymentWebhookRoutes = new Hono().post("/", async (c) => {
  const raw = await c.req.text();
  const event = payments.parseWebhook(raw, {
    "x-signature": c.req.header("x-signature"),
    "x-event-name": c.req.header("x-event-name"),
  });
  if (!event) {
    return c.json({ error: "Invalid signature" }, 400);
  }
  try {
    await handlePaymentEvent(event);
  } catch (error) {
    console.error("[payments webhook] handler failed", error);
    return c.json({ error: "Handler failed" }, 500);
  }
  return c.json({ received: true });
});
