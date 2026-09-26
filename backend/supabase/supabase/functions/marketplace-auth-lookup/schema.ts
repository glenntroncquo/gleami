import { z } from "zod";

export const marketplaceAuthLookupSchema = z.object({
  email: z.string().trim().email().max(254),
});
