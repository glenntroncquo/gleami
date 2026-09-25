import { z } from "zod";

export const marketplaceSuggestSchema = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(20).optional(),
});
