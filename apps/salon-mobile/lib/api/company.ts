import { supabase } from '@/lib/supabase';

export type Company = {
  id: string;
  name: string;
  email: string | null;
  description: string | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  state: string | null;
  country: string | null;
};

export type CompanyFields = {
  name: string;
  email: string;
  description: string;
  street: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
};

const COMPANY_SELECT = 'id, name, email, description, street, city, postal_code, state, country';

export async function fetchCompany(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase.from('company').select(COMPANY_SELECT).eq('id', companyId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCompany(companyId: string, fields: CompanyFields): Promise<void> {
  const { error } = await supabase
    .from('company')
    .update({
      name: fields.name,
      email: fields.email || null,
      description: fields.description || null,
      street: fields.street || null,
      city: fields.city || null,
      postal_code: fields.postalCode || null,
      state: fields.state || null,
      country: fields.country || null,
    })
    .eq('id', companyId);
  if (error) throw error;
}
