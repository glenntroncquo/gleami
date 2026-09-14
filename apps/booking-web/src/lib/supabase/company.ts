import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

export type PublicCompany = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  city?: string | null;
  postal_code?: string | null;
  street?: string | null;
  image_url?: string | null;
};

async function getCompany(
  body: Record<string, string>,
): Promise<PublicCompany | null> {
  if (!SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/company-get`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PublicCompany;
  } catch {
    return null;
  }
}

export async function getCompanyById(
  companyId: string,
): Promise<PublicCompany | null> {
  return getCompany({ company_id: companyId });
}

export async function getCompanyBySlug(
  companySlug: string,
): Promise<PublicCompany | null> {
  return getCompany({ slug: companySlug });
}
