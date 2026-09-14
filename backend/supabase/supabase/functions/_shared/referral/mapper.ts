import type { Database } from "@/types/database";
import type { ReferralCode, ReferralRedemption } from "./entity.ts";

type ReferralCodeRow = Database["public"]["Tables"]["referral_code"]["Row"];
type ReferralRedemptionRow = Database["public"]["Tables"]["referral_redemption"]["Row"];

export function toReferralCode(row: ReferralCodeRow): ReferralCode {
  return {
    id: row.id,
    companyId: row.company_id,
    referrerClientId: row.referrer_client_id,
    code: row.code,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toReferralRedemption(row: ReferralRedemptionRow): ReferralRedemption {
  return {
    id: row.id,
    companyId: row.company_id,
    referralCodeId: row.referral_code_id,
    referrerClientId: row.referrer_client_id,
    referredClientId: row.referred_client_id,
    appointmentId: row.appointment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
