import type { Database } from "@/types/database";
import type {
  Client,
  ClientNote,
  ClientSearchResult,
  ClientNameLookup,
} from "./entity.ts";

type ClientRow = Database["public"]["Tables"]["client"]["Row"];
type ClientNoteRow = Database["public"]["Tables"]["client_notes"]["Row"];
type ClientSearchResultRow =
  Database["public"]["Functions"]["search_clients_by_company"]["Returns"][number];

export function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toClientNote(row: ClientNoteRow): ClientNote {
  return {
    id: row.id,
    companyId: row.company_id,
    clientId: row.client_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toClientSearchResult(row: ClientSearchResultRow): ClientSearchResult {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    rank: row.rank,
  };
}

export interface ClientNameLookupRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export function toClientNameLookup(row: ClientNameLookupRow): ClientNameLookup {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
  };
}
