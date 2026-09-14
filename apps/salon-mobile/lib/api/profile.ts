import { supabase } from '@/lib/supabase';

export type StaffProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  image_path: string | null;
};

/** The staff record linked to the logged-in auth user, if any (owners without a staff row get null). */
export async function fetchOwnStaffProfile(userId: string, companyId: string): Promise<StaffProfile | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, first_name, last_name, email, image_path')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
