import type { ValidationTargets } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";

export const validate = <Target extends keyof ValidationTargets, Schema extends ZodType>(target: Target, schema: Schema) => {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues[0].message }, 400);
    }
  });
};
