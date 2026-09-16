import { notFound, redirect } from "next/navigation";
import { isValidCompanyId, isValidSlug } from "@/lib/constants";

type PageProps = {
  searchParams: Promise<{ companyId?: string; companySlug?: string }>;
};

export default async function HomePage({ searchParams }: PageProps) {
  const { companyId, companySlug } = await searchParams;

  if (companyId && isValidCompanyId(companyId)) {
    redirect(`/${companyId}`);
  }

  if (companySlug && isValidSlug(companySlug)) {
    redirect(`/${companySlug}`);
  }

  notFound();
}
