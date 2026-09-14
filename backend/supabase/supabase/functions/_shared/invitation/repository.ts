import { supabaseAdmin } from "../infrastructure/supabase/client.ts";
import { RepositoryError } from "../infrastructure/errors.ts";
import { toInvitation } from "./mapper.ts";
import type { Invitation } from "./entity.ts";

// Invites are rows only. Accept / role-change must write company_membership
// or location_membership (source of truth). Do not stamp
// app_metadata.company_ids — Phase 3 retired that claim. Phase 5 dropped
// staff.role and staff_company.
export const invitationRepository = {
  async findById(id: string): Promise<Invitation | null> {
    const { data, error } = await supabaseAdmin
      .from("invitation")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new RepositoryError("Failed to fetch invitation by id", { cause: error });
    }

    return data ? toInvitation(data) : null;
  },

  async findManyByCompanyId(companyId: string): Promise<Invitation[]> {
    const { data, error } = await supabaseAdmin
      .from("invitation")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      throw new RepositoryError("Failed to fetch invitations by company id", { cause: error });
    }

    return (data ?? []).map(toInvitation);
  },
};
