import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import { toStaff } from "./mapper.ts";
import type { Staff } from "./entity.ts";

export const staffRepository = {
  async findById(id: string): Promise<Staff | null> {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch staff by id", { cause: error });
    }

    return data ? toStaff(data) : null;
  },

  async findManyByCompanyId(companyId: string, staffIds?: string[]): Promise<Staff[]> {
    if (staffIds && staffIds.length === 0) return [];

    let query = supabaseAdmin
      .from("staff")
      .select("*")
      .eq("company_id", companyId);

    if (staffIds) {
      query = query.in("id", staffIds);
    }

    const { data, error } = await query
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) {
      throw new RepositoryError("Failed to fetch staff by company id", { cause: error });
    }

    return (data ?? []).map(toStaff);
  },

  async findIdsBySlugs(companyId: string, slugs: string[]): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("company_id", companyId)
      .in("slug", slugs);

    if (error) {
      throw new RepositoryError("Failed to fetch staff ids by slugs", { cause: error });
    }

    return (data ?? []).map((row) => row.id);
  },
};
