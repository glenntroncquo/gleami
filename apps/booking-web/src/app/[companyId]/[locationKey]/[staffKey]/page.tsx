import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingShell } from "@/components/booking/BookingShell";
import { LocationUnavailable } from "@/components/booking/LocationUnavailable";
import {
  buildCompanyMetadata,
  classifyRouteKey,
  dedupe,
  parseList,
  resolveCompany,
  resolveLocationPin,
  staffEmbedFromKey,
  unverifiedLocationMetadata,
} from "@/lib/booking";
import { parseDepositReturn } from "@/lib/deposit";

type PageProps = {
  params: Promise<{
    companyId: string;
    locationKey: string;
    staffKey: string;
  }>;
  /** service is a short alias for serviceIds. No treatmentId / priceOptionId. */
  searchParams: Promise<{
    service?: string | string[];
    serviceIds?: string | string[];
    serviceVariantIds?: string | string[];
    deposit?: string | string[];
    checkout?: string | string[];
    session_id?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { companyId, locationKey, staffKey } = await params;
  const company = await resolveCompany(companyId);
  if (!company) {
    return { title: "Pagina niet gevonden", robots: { index: false } };
  }

  const pin = await resolveLocationPin(company.id, locationKey);
  if (pin.status === "found") {
    return buildCompanyMetadata(company, {
      location: pin.location,
      staffKey,
    });
  }

  return unverifiedLocationMetadata(company);
}

export default async function LocationStaffBookingPage({
  params,
  searchParams,
}: PageProps) {
  const { companyId, locationKey, staffKey } = await params;
  const { service, serviceIds, serviceVariantIds, deposit, checkout, session_id } =
    await searchParams;

  const company = await resolveCompany(companyId);
  if (!company) {
    notFound();
  }

  const pin = await resolveLocationPin(company.id, locationKey);
  const staff = classifyRouteKey(staffKey);
  if (pin.status === "invalid" || pin.status === "missing" || !staff) {
    notFound();
  }
  if (pin.status === "unavailable") {
    return <LocationUnavailable companyName={company.name} />;
  }

  const preselectedServiceIds = dedupe([
    ...parseList(service),
    ...parseList(serviceIds),
  ]);
  const preselectedServiceVariantIds = dedupe(parseList(serviceVariantIds));

  return (
    <BookingShell
      company={company}
      location={pin.location}
      staffKey={staffKey}
      depositReturn={parseDepositReturn({ deposit, checkout, session_id })}
      preselectedLocationId={pin.location.id}
      preselectedLocationSlug={pin.location.slug ?? undefined}
      {...staffEmbedFromKey(staff)}
      preselectedServiceIds={preselectedServiceIds}
      preselectedServiceVariantIds={preselectedServiceVariantIds}
    />
  );
}
