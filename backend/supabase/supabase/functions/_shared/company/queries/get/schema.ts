import { z } from "zod";

export const getCompanyQuerySchema = z
  .object({
    company_id: z.string().uuid("Invalid company_id format").optional(),
    slug: z.string().min(1, "slug cannot be empty").optional(),
  })
  .refine((data) => Boolean(data.company_id) || Boolean(data.slug), {
    message: "Either company_id or slug is required",
  })
  .transform((data) => ({
    companyId: data.company_id,
    slug: data.slug,
  }));

export type GetCompanyQueryInput = z.infer<typeof getCompanyQuerySchema>;
