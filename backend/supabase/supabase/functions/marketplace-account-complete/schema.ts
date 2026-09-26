import { z } from "zod";

const name = z.string().trim().min(1).max(80);

export const marketplaceAccountCompleteSchema = z.object({
  firstName: name,
  lastName: name,
  /** E.164, e.g. +32496054389. */
  phone: z.string().trim().regex(/^\+[1-9]\d{6,14}$/),
  /** Only for accounts without a password yet (email-code sign-ups). */
  password: z.string().min(8).max(72).optional(),
});
