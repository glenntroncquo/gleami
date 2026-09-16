import { DepositReturnNotice } from "@/components/booking/DepositReturnNotice";
import { SalonBooking, type SalonBookingProps } from "@/components/booking/SalonBooking";
import { buildBookingPath } from "@/lib/booking";
import { getBookingOrigin } from "@/lib/booking-origin";
import {
  depositReturnUrls,
  readCompanyDeposit,
  type DepositReturn,
} from "@/lib/deposit";
import type { PublicCompany } from "@/lib/supabase/company";
import type { PublicLocation } from "@/lib/supabase/location";

type BookingShellProps = Omit<
  SalonBookingProps,
  | "companyId"
  | "successUrl"
  | "cancelUrl"
  | "depositEnabled"
  | "depositAmount"
  | "depositReturn"
> & {
  company: PublicCompany;
  location?: PublicLocation;
  staffKey?: string;
  depositReturn?: DepositReturn | null;
};

export async function BookingShell({
  company,
  location,
  staffKey,
  depositReturn = null,
  ...embed
}: BookingShellProps) {
  const bookingPath = buildBookingPath(company, location, staffKey);
  // Always inject return URLs (not gated on deposit_enabled). company-get may
  // omit that flag; BE only requires the URLs when a deposit is due.
  const { successUrl, cancelUrl } = depositReturnUrls(
    bookingPath,
    await getBookingOrigin(),
  );
  const deposit = readCompanyDeposit(company);

  return (
    <div className="booking-shell">
      {depositReturn === "cancel" ? (
        <DepositReturnNotice status={depositReturn} />
      ) : null}
      <SalonBooking
        {...embed}
        companyId={company.id}
        successUrl={successUrl}
        cancelUrl={cancelUrl}
        depositEnabled={deposit.enabled || undefined}
        depositAmount={deposit.enabled ? (deposit.amount ?? undefined) : undefined}
        depositReturn={depositReturn}
      />
    </div>
  );
}
