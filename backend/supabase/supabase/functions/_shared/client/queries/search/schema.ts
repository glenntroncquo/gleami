import { z } from "zod";

export const searchClientsQuerySchema = z
  .object({
    search_term: z.string().trim().min(2, "search_term must be at least 2 characters"),
    company_id: z.string().uuid("Invalid company_id format"),
  })
  .transform((data) => ({
    searchTerm: data.search_term,
    companyId: data.company_id,
  }));

export type SearchClientsQueryInput = z.infer<typeof searchClientsQuerySchema>;
