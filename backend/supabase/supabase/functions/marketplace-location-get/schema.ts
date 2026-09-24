import { z } from "zod";

export const marketplaceLocationGetSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});
