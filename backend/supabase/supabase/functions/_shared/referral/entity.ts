export interface ReferralCode {
  id: string;
  companyId: string;
  referrerClientId: string | null;
  code: string;
  isActive: boolean | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReferralRedemption {
  id: string;
  companyId: string;
  referralCodeId: string;
  referrerClientId: string | null;
  referredClientId: string;
  appointmentId: string | null;
  createdAt: string;
  updatedAt: string | null;
}
