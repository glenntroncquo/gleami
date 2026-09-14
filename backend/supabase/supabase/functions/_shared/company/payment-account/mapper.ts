import type { Database } from "@/types/database";
import type { CompanyPaymentAccount } from "./entity.ts";

type CompanyPaymentAccountRow = Database["public"]["Tables"]["company_payment_account"]["Row"];

export function toCompanyPaymentAccount(row: CompanyPaymentAccountRow): CompanyPaymentAccount {
  return {
    companyId: row.company_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    detailsSubmitted: row.details_submitted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
