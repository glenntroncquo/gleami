import { z } from "zod";

const rawBodySchema = z.any().transform((raw) => ({
  company_id: raw?.company_id ?? raw?.companyId,
  return_url: raw?.return_url ?? raw?.returnUrl,
  refresh_url: raw?.refresh_url ?? raw?.refreshUrl,
}));

const bodySchema = z.object({
  company_id: z.string().uuid("Invalid company_id format"),
  return_url: z.string().url("return_url must be an absolute URL"),
  refresh_url: z.string().url("refresh_url must be an absolute URL"),
});

export const createAccountLinkSchema = rawBodySchema.pipe(bodySchema);

export type CreateAccountLinkInput = z.infer<typeof createAccountLinkSchema>;
