import { z } from "zod";

const bboxSchema = z.object({
  minLng: z.number().gte(-180).lte(180),
  minLat: z.number().gte(-90).lte(90),
  maxLng: z.number().gte(-180).lte(180),
  maxLat: z.number().gte(-90).lte(90),
}).refine((bbox) => bbox.minLng < bbox.maxLng && bbox.minLat < bbox.maxLat, {
  message: "bbox min must be less than max",
});

export const marketplaceSearchSchema = z.object({
  bbox: bboxSchema.optional(),
  center: z.object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
  }).optional(),
  radiusKm: z.number().positive().max(200).optional(),
  categoryIds: z.array(z.string().uuid()).max(11).optional(),
  q: z.string().trim().min(1).max(80).optional(),
  cursor: z.string().min(1).max(200).optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).refine(
  (value) => Boolean(value.bbox || value.center || value.q || (value.categoryIds && value.categoryIds.length > 0)),
  { message: "provide bbox, center, categoryIds, or q" },
);

export type MarketplaceSearchBody = z.infer<typeof marketplaceSearchSchema>;
