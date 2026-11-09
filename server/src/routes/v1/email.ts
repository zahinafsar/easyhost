import { Hono } from "hono";
import { sendProjectEmail } from "../../lib/project-email.js";
import { emailComingSoon } from "../../lib/email.js";
import { validate } from "../../lib/validator.js";
import { sendEmailSchema } from "../../lib/validations.js";
import { requireApiKey } from "../../middleware/require-api-key.js";
import type { ApiKeyEnv } from "../../lib/types.js";

export const v1EmailRoutes = new Hono<ApiKeyEnv>()
  .use(emailComingSoon)
  .use(requireApiKey)
  .post("/send", validate("json", sendEmailSchema), async (c) => {
    const result = await sendProjectEmail(c.get("projectId"), c.req.valid("json"));
    if (!result.ok) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json({ id: result.id, from: result.from });
  });
