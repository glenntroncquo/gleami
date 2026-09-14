export interface CompanyPaymentAccount {
  companyId: string;
  provider: string;
  providerAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  createdAt: string;
  updatedAt: string;
}
