import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import { toCompany, toNearbyCompany } from "./mapper.ts";
import type { Company, NearbyCompany } from "./entity.ts";

export interface SearchNearbyCompaniesParams {
  latitude: number;
  longitude: number;
  radiusM: number;
  searchTerm: string | null;
}

export const companyRepository = {
  async findById(id: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from("company")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch company by id", { cause: error });
    }

    return data ? toCompany(data) : null;
  },

  async findBySlug(slug: string): Promise<Company | null> {
    const { data, error } = await supabaseAdmin
      .from("company")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch company by slug", { cause: error });
    }

    return data ? toCompany(data) : null;
  },

  async searchNearby(params: SearchNearbyCompaniesParams): Promise<NearbyCompany[]> {
    const { data, error } = await supabaseAdmin.rpc("nearby_companies_v2", {
      user_lat: params.latitude,
      user_lon: params.longitude,
      radius_m: params.radiusM,
      search_term: params.searchTerm ?? undefined,
    });

    if (error) {
      throw new RepositoryError("Failed to search nearby companies", { cause: error });
    }

    return (data ?? []).map(toNearbyCompany);
  },
};
