import { z } from "zod";

export const marketplaceNextAvailableSchema = z.object({
  pairs: z.array(z.object({
    locationId: z.string().uuid(),
    serviceId: z.string().uuid(),
    serviceVariantId: z.string().uuid(),
  })).min(1).max(24),
});
