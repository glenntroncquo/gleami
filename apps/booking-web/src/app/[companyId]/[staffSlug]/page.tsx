import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalonBooking } from "@/components/booking/SalonBooking";
import {
  buildCompanyMetadata,
  dedupe,
  parseList,
  resolveCompany,
} from "@/lib/booking";
import { isValidCompanyId, isValidSlug } from "@/lib/constants";

type PageProps = {
  params: Promise<{ companyId: string; staffSlug: string }>;
  searchParams: Promise<{
    service?: string | string[];
    serviceIds?: string | string[];
    serviceVariantIds?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { companyId } = await params;
  const company = await resolveCompany(companyId);
  if (!company) {
    return { title: "Pagina niet gevonden", robots: { index: false } };
  }

  return buildCompanyMetadata(company);
}

export default async function StaffBookingPage({
  params,
  searchParams,
}: PageProps) {
  const { companyId, staffSlug } = await params;
  const { service, serviceIds, serviceVariantIds } = await searchParams;

  const company = await resolveCompany(companyId);
  if (!company) {
    notFound();
  }

  const preselectedStaffIds = isValidCompanyId(staffSlug) ? [staffSlug] : [];
  const preselectedStaffSlugs =
    !isValidCompanyId(staffSlug) && isValidSlug(staffSlug) ? [staffSlug] : [];

  if (preselectedStaffIds.length === 0 && preselectedStaffSlugs.length === 0) {
    notFound();
  }

  const preselectedServiceIds = dedupe([
    ...parseList(service),
    ...parseList(serviceIds),
  ]);
  const preselectedServiceVariantIds = dedupe(parseList(serviceVariantIds));

  return (
    <div className="booking-shell">
      <SalonBooking
        companyId={company.id}
        preselectedStaffIds={preselectedStaffIds}
        preselectedStaffSlugs={preselectedStaffSlugs}
        preselectedServiceIds={preselectedServiceIds}
        preselectedServiceVariantIds={preselectedServiceVariantIds}
      />
    </div>
  );
}
