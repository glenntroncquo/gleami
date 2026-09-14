import type { Database } from "@/types/database";
import type { Invitation } from "./entity.ts";

type InvitationRow = Database["public"]["Tables"]["invitation"]["Row"];

export function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
