import { hydrateLocationsForCompany, pickLocationId } from '@/lib/api/memberships';
import { supabase } from '@/lib/supabase';

/** Live `client_location` / `location` tables predate the generated snapshot in this repo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const live = supabase as any;

const CLIENT_FIELDS = 'id, first_name, last_name, email, phone';
const CLIENT_EMBED = `client:client_id ( ${CLIENT_FIELDS} )`;

export type ClientSearchResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  rank?: number;
};

export async function searchClients(term: string, companyId: string): Promise<ClientSearchResult[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase.functions.invoke('client-search', {
    body: { search_term: trimmed, company_id: companyId },
  });

  if (error) throw error;
  return (data as ClientSearchResult[]) ?? [];
}

export type Client = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export type ClientFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

function sortByName(a: Client, b: Client) {
  const nameA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim().toLowerCase();
  const nameB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim().toLowerCase();
  return nameA.localeCompare(nameB);
}

function asClient(value: unknown): Client | null {
  if (!value || typeof value !== 'object') return null;
  const record = Array.isArray(value) ? value[0] : value;
  if (!record || typeof record !== 'object') return null;
  const client = record as Partial<Client>;
  if (typeof client.id !== 'string' || client.id.length === 0) return null;
  return {
    id: client.id,
    first_name: typeof client.first_name === 'string' ? client.first_name : null,
    last_name: typeof client.last_name === 'string' ? client.last_name : null,
    email: typeof client.email === 'string' ? client.email : null,
    phone: typeof client.phone === 'string' ? client.phone : null,
  };
}

function clientsFromLocationRows(data: unknown): Client[] {
  const rows = Array.isArray(data) ? data : [];
  const seen = new Set<string>();
  const clients: Client[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const client = asClient((row as { client?: unknown }).client);
    if (!client || seen.has(client.id)) continue;
    seen.add(client.id);
    clients.push(client);
  }
  return clients.sort(sortByName);
}

/**
 * Resolve the shop to attach a new client to. Prefer the active `locationId`
 * from LocationProvider; if a caller only has `companyId`, use that company's
 * primary (then first) location — same pick as the existing location switcher.
 */
export async function resolveClientLocationId(companyId: string, locationId?: string | null): Promise<string> {
  if (locationId) return locationId;
  const locations = await hydrateLocationsForCompany(companyId);
  const picked = pickLocationId(locations, null);
  if (!picked) {
    throw new Error('locationId is required');
  }
  return picked;
}

/**
 * `client` has no `company_id` column — membership is via `client_location`.
 * Prefer the selected shop; otherwise distinct clients for the company via
 * `location.company_id`. `client_location` has no `is_active` column.
 */
export async function fetchClients(companyId: string, locationId?: string | null): Promise<Client[]> {
  const query = locationId
    ? live.from('client_location').select(CLIENT_EMBED).eq('location_id', locationId)
    : live
        .from('client_location')
        .select(`${CLIENT_EMBED}, location:location_id!inner ( company_id )`)
        .eq('location.company_id', companyId);

  const { data, error } = await query;
  if (error) throw error;
  return clientsFromLocationRows(data);
}

export const CLIENT_PAGE_SIZE = 25;

export type ClientPage = {
  clients: Client[];
  total: number;
};

const MOBILE_SEARCH_COLUMNS = ['first_name', 'last_name', 'email', 'phone'] as const;

/** One PostgREST `or` filter per word, ANDed by the caller. */
function clientSearchFilters(term: string): string[] {
  const tokens = term
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[%_,().*\\":]/g, ''))
    .filter((token) => token.length > 0)
    .slice(0, 5);

  return tokens.map((token) => {
    const pattern = `"%${token}%"`;
    return MOBILE_SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`).join(',');
  });
}

/**
 * One page of clients for the selected shop. Membership is `client_location`.
 * Search matches name, email, or phone so paging stays correct while filtering.
 */
export async function fetchClientsPage(args: {
  locationId: string;
  page: number;
  pageSize?: number;
  search?: string;
  sortDescending?: boolean;
}): Promise<ClientPage> {
  const pageSize = Math.max(1, args.pageSize ?? CLIENT_PAGE_SIZE);
  const page = Math.max(0, args.page);
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const ascending = !args.sortDescending;

  let query = live
    .from('client')
    .select(`${CLIENT_FIELDS}, client_location!inner(location_id)`, { count: 'exact' })
    .eq('client_location.location_id', args.locationId);

  for (const filter of clientSearchFilters(args.search ?? '')) {
    query = query.or(filter);
  }

  const { data, error, count } = await query
    .order('first_name', { ascending, nullsFirst: false })
    .order('last_name', { ascending, nullsFirst: false })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw error;

  const clients = (Array.isArray(data) ? data : [])
    .map((row) => asClient(row))
    .filter((client): client is Client => client !== null);

  return { clients, total: typeof count === 'number' ? count : clients.length };
}

export async function fetchClient(clientId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('client')
    .select('id, first_name, last_name, email, phone')
    .eq('id', clientId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createClient(companyId: string, fields: ClientFields, locationId?: string | null): Promise<Client> {
  const shopId = await resolveClientLocationId(companyId, locationId);

  const { data: client, error: insertError } = await supabase
    .from('client')
    .insert({
      first_name: fields.firstName || null,
      last_name: fields.lastName || null,
      email: fields.email || null,
      phone: fields.phone || null,
    })
    .select('id, first_name, last_name, email, phone')
    .single();

  if (insertError) throw insertError;

  const { error: linkError } = await live.from('client_location').insert({
    client_id: client.id,
    location_id: shopId,
  });

  if (linkError) throw linkError;

  return client;
}

export async function updateClient(clientId: string, fields: ClientFields): Promise<void> {
  const { error } = await supabase
    .from('client')
    .update({
      first_name: fields.firstName || null,
      last_name: fields.lastName || null,
      email: fields.email || null,
      phone: fields.phone || null,
    })
    .eq('id', clientId);

  if (error) throw error;
}

export type ClientNote = {
  id: string;
  note: string | null;
  created_at: string;
};

export async function fetchClientNotes(clientId: string, companyId: string): Promise<ClientNote[]> {
  const { data, error } = await supabase
    .from('client_notes')
    .select('id, note, created_at')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function addClientNote(clientId: string, companyId: string, note: string): Promise<void> {
  const { error } = await supabase.from('client_notes').insert({ client_id: clientId, company_id: companyId, note });

  if (error) throw error;
}

export async function deleteClientNote(noteId: string, clientId: string, companyId: string): Promise<void> {
  const { data, error } = await supabase
    .from('client_notes')
    .delete()
    .eq('id', noteId)
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .select('id')
    .single();

  if (error) throw error;
  if (!data) throw new Error('Note was not deleted');
}
