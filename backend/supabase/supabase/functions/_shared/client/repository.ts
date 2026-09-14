import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import { toClient, toClientSearchResult, toClientNameLookup } from "./mapper.ts";
import type { Client, ClientSearchResult, ClientNameLookup } from "./entity.ts";

export interface SearchClientsByCompanyParams {
  searchTerm: string;
  companyId: string;
}

export interface CreateClientParams {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface UpdateClientNamesParams {
  firstName?: string;
  lastName?: string;
}

export const clientRepository = {
  async findById(id: string): Promise<Client | null> {
    const { data, error } = await supabaseAdmin
      .from("client")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch client by id", { cause: error });
    }

    return data ? toClient(data) : null;
  },

  async searchByCompany(params: SearchClientsByCompanyParams): Promise<ClientSearchResult[]> {
    const { data, error } = await supabaseAdmin.rpc("search_clients_by_company", {
      search_term: params.searchTerm,
      p_company_id: params.companyId,
    });

    if (error) {
      throw new RepositoryError("Failed to search clients", { cause: error });
    }

    return (data ?? []).map(toClientSearchResult);
  },

  async findByEmail(email: string): Promise<ClientNameLookup | null> {
    const { data, error } = await supabaseAdmin
      .from("client")
      .select("id, first_name, last_name")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch client by email", { cause: error });
    }

    return data ? toClientNameLookup(data) : null;
  },

  async create(params: CreateClientParams): Promise<{ id: string }> {
    const { data, error } = await supabaseAdmin
      .from("client")
      .insert({
        email: params.email ?? null,
        first_name: params.firstName ?? null,
        last_name: params.lastName ?? null,
      })
      .select("id")
      .single();

    if (error) {
      throw new RepositoryError("Failed to create client", { cause: error });
    }

    return { id: data.id };
  },

  async updateNames(id: string, params: UpdateClientNamesParams): Promise<void> {
    const { error } = await supabaseAdmin
      .from("client")
      .update({
        ...(params.firstName ? { first_name: params.firstName } : {}),
        ...(params.lastName ? { last_name: params.lastName } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new RepositoryError("Failed to update client", { cause: error });
    }
  },

  async isLinkedToCompany(clientId: string, companyId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("client_location")
      .select("client_id, location!inner(company_id)")
      .eq("client_id", clientId)
      .eq("location.company_id", companyId)
      .limit(1);

    if (error) {
      throw new RepositoryError("Failed to verify client-company link", { cause: error });
    }

    return (data?.length ?? 0) > 0;
  },
};
