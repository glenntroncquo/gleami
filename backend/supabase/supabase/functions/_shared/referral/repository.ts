import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import { toReferralCode } from "./mapper.ts";
import type { ReferralCode } from "./entity.ts";

export const referralRepository = {
  async findById(id: string): Promise<ReferralCode | null> {
    const { data, error } = await supabaseAdmin
      .from("referral_code")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch referral code by id", { cause: error });
    }

    return data ? toReferralCode(data) : null;
  },

  async findManyByCompanyId(companyId: string): Promise<ReferralCode[]> {
    const { data, error } = await supabaseAdmin
      .from("referral_code")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      throw new RepositoryError("Failed to fetch referral codes by company id", { cause: error });
    }

    return (data ?? []).map(toReferralCode);
  },
};
