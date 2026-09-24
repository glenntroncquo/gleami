import { isMissingSchemaError } from "./errors";
import type { LocationQueryError, LocationSupabase } from "./client";
import {
  buildCreateLocationArgSets,
  buildUpdateLocationArgSets,
  isMissingRpc,
  isWrongArgsError,
  locationWriteFields,
  normalizeLocationList,
  normalizeLocationRecord,
} from "./rpc";
import {
  buildLocationMembershipInsert,
  pickLocationStaffRoleId,
} from "./staff-scope";
import { LOCATION_SELECT, type LocationRecord, type LocationWrite } from "./types";

async function tryRpc(
  supabase: LocationSupabase,
  fn: string,
  argSets: Record<string, unknown>[],
): Promise<{ data: unknown; error: LocationQueryError; missing: boolean }> {
  let lastError: LocationQueryError = { message: `RPC ${fn} failed` };
  let sawMissing = false;

  for (const args of argSets) {
    const { data, error } = await supabase.rpc(fn, args);
    if (!error) return { data, error: null, missing: false };
    lastError = error;
    if (isWrongArgsError(error) || isMissingSchemaError(error)) {
      sawMissing = true;
      continue;
    }
    return { data: null, error, missing: false };
  }

  return { data: null, error: lastError, missing: sawMissing || isMissingRpc(lastError) };
}

async function asRows<T>(
  builder: PromiseLike<{ data: unknown; error: LocationQueryError }>,
): Promise<{ data: T[]; error: LocationQueryError }> {
  const { data, error } = await builder;
  if (error) return { data: [], error };
  return { data: (Array.isArray(data) ? data : []) as T[], error: null };
}

export async function fetchLocationsById(
  supabase: LocationSupabase,
  locationIds: string[],
): Promise<LocationRecord[]> {
  if (locationIds.length === 0) return [];
  const { data, error } = await asRows<LocationRecord>(
    supabase
      .from("location")
      .select(LOCATION_SELECT)
      .in("id", locationIds)
      .order("name", { ascending: true }),
  );
  if (error) {
    if (!isMissingSchemaError(error)) {
      console.warn("Failed to load locations", error);
    }
    return [];
  }
  return data;
}

export async function fetchCompanyLocations(
  supabase: LocationSupabase,
  companyId: string,
): Promise<LocationRecord[]> {
  if (!companyId) return [];

  // public.my_locations() — never .from('my_locations') (that is not a table).
  const rpc = await supabase.rpc("my_locations");
  if (!rpc.error) {
    const rows = normalizeLocationList(rpc.data)
      .filter((row) => row.company_id === companyId)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.name.localeCompare(b.name));
    if (rows.length > 0) return rows;
  } else if (!isMissingRpc(rpc.error) && !isMissingSchemaError(rpc.error)) {
    console.warn("my_locations failed; falling back to location table", rpc.error);
  }

  const { data, error } = await asRows<LocationRecord>(
    supabase
      .from("location")
      .select(LOCATION_SELECT)
      .eq("company_id", companyId)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true }),
  );
  if (error) {
    if (!isMissingSchemaError(error)) {
      console.warn("Failed to load company locations", error);
    }
    return [];
  }
  return data;
}

export async function createLocation(
  supabase: LocationSupabase,
  companyId: string,
  input: LocationWrite,
): Promise<{ data: LocationRecord | null; error: LocationQueryError }> {
  const fields = locationWriteFields(input);
  const rpc = await tryRpc(
    supabase,
    "create_location",
    buildCreateLocationArgSets(companyId, input),
  );

  if (!rpc.missing) {
    if (rpc.error) return { data: null, error: rpc.error };
    const record = normalizeLocationRecord(rpc.data, {
      company_id: companyId,
      name: fields.name as string,
      slug: fields.slug as string | null,
      country: fields.country as string | null,
      state: fields.state as string | null,
      city: fields.city as string | null,
      postal_code: fields.postal_code as string | null,
      street: fields.street as string | null,
      email: fields.email as string | null,
      timezone: fields.timezone as string,
      is_active: fields.is_active as boolean,
      is_primary: false,
      is_listed: false,
    });
    if (record) {
      await copyPrimaryLocationServices(supabase, companyId, record.id);
      return { data: record, error: null };
    }
    return {
      data: null,
      error: { message: "create_location returned no location id" },
    };
  }

  // Live prod INSERT RLS returns 42501 for table writes even when the
  // owner has locations:manage. The SECURITY DEFINER RPC is the write path.
  const { data, error } = await supabase
    .from("location")
    .insert({
      company_id: companyId,
      ...fields,
      is_primary: false,
      is_listed: false,
    })
    .select(LOCATION_SELECT)
    .single();

  if (error) return { data: null, error };
  const record = data as LocationRecord;
  await copyPrimaryLocationServices(supabase, companyId, record.id);
  return { data: record, error: null };
}

export function buildLocationServiceCopies(
  serviceIds: string[],
  locationId: string,
): { service_id: string; location_id: string }[] {
  return [...new Set(serviceIds.filter(Boolean))].map((service_id) => ({
    service_id,
    location_id: locationId,
  }));
}

/**
 * Copy primary location_service rows onto a newly created shop so shop B
 * is not empty. Table inserts only — no invented RPC. Soft-fails: location
 * create still succeeds if the copy is denied or the table is missing.
 */
export async function copyPrimaryLocationServices(
  supabase: LocationSupabase,
  companyId: string,
  targetLocationId: string,
): Promise<{ copied: number; error: LocationQueryError }> {
  if (!companyId || !targetLocationId) return { copied: 0, error: null };

  const { data: primaryRows, error: primaryError } = await asRows<{ id: string }>(
    supabase
      .from("location")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_primary", true),
  );
  if (primaryError) {
    if (isMissingSchemaError(primaryError)) return { copied: 0, error: null };
    console.warn("Failed to load primary location for service copy", primaryError);
    return { copied: 0, error: primaryError };
  }

  const primaryId = primaryRows.find((row) => row.id !== targetLocationId)?.id;
  if (!primaryId) return { copied: 0, error: null };

  const services = await fetchServiceIdsForLocation(supabase, primaryId);
  if (!services.tablePresent) return { copied: 0, error: null };
  if (services.error) {
    console.warn("Failed to load primary location_service rows", services.error);
    return { copied: 0, error: services.error };
  }

  const rows = buildLocationServiceCopies(services.data, targetLocationId);
  if (rows.length === 0) return { copied: 0, error: null };

  const { error } = await supabase.from("location_service").insert(rows);
  if (error) {
    if (isMissingSchemaError(error) || error.code === "23505") {
      return { copied: 0, error: null };
    }
    console.warn("Failed to copy location_service onto new location", error);
    return { copied: 0, error };
  }
  return { copied: rows.length, error: null };
}

export async function updateLocation(
  supabase: LocationSupabase,
  locationId: string,
  input: LocationWrite,
): Promise<{ data: LocationRecord | null; error: LocationQueryError }> {
  const fields = locationWriteFields(input);
  const rpc = await tryRpc(
    supabase,
    "update_location",
    buildUpdateLocationArgSets(locationId, input),
  );

  if (!rpc.missing) {
    if (rpc.error) return { data: null, error: rpc.error };
    const record = normalizeLocationRecord(rpc.data, {
      id: locationId,
      name: fields.name as string,
      slug: fields.slug as string | null,
      country: fields.country as string | null,
      state: fields.state as string | null,
      city: fields.city as string | null,
      postal_code: fields.postal_code as string | null,
      street: fields.street as string | null,
      email: fields.email as string | null,
      timezone: fields.timezone as string,
      is_active: fields.is_active as boolean,
    });
    if (record) return { data: record, error: null };
    return { data: { ...(fields as LocationWrite), id: locationId } as LocationRecord, error: null };
  }

  const { data, error } = await supabase
    .from("location")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId)
    .select(LOCATION_SELECT)
    .single();

  if (error) return { data: null, error };
  return { data: data as LocationRecord, error: null };
}

export async function setLocationActive(
  supabase: LocationSupabase,
  locationId: string,
  isActive: boolean,
): Promise<{ error: LocationQueryError }> {
  const rpc = await tryRpc(supabase, "update_location", [
    { p_location_id: locationId, p_is_active: isActive },
    { location_id: locationId, is_active: isActive },
  ]);
  if (!rpc.missing) return { error: rpc.error };

  const { error } = await supabase
    .from("location")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", locationId);
  return { error };
}

export async function fetchClientIdsForLocation(
  supabase: LocationSupabase,
  locationId: string,
): Promise<{ data: string[]; error: LocationQueryError; tablePresent: boolean }> {
  const { data, error } = await asRows<{ client_id: string }>(
    supabase.from("client_location").select("client_id").eq("location_id", locationId),
  );
  if (error) {
    return {
      data: [],
      error,
      tablePresent: !isMissingSchemaError(error),
    };
  }
  return {
    data: data.map((row) => row.client_id).filter(Boolean),
    error: null,
    tablePresent: true,
  };
}

/**
 * Company-wide clients are the distinct client_ids on client_location
 * whose location belongs to the company. client_company is not used.
 */
export async function fetchClientIdsForCompany(
  supabase: LocationSupabase,
  companyId: string,
): Promise<{ data: string[]; error: LocationQueryError; tablePresent: boolean }> {
  const { data, error } = await asRows<{ client_id: string }>(
    supabase
      .from("client_location")
      .select("client_id, location:location_id!inner(company_id)")
      .eq("location.company_id", companyId),
  );
  if (error) {
    return {
      data: [],
      error,
      tablePresent: !isMissingSchemaError(error),
    };
  }
  return {
    data: [...new Set(data.map((row) => row.client_id).filter(Boolean))],
    error: null,
    tablePresent: true,
  };
}

export async function linkClientToLocation(
  supabase: LocationSupabase,
  clientId: string,
  locationId: string | null,
): Promise<{ error: LocationQueryError }> {
  if (!locationId) return { error: null };
  const { error } = await supabase.from("client_location").insert({
    client_id: clientId,
    location_id: locationId,
  });
  if (error && isMissingSchemaError(error)) return { error: null };
  return { error };
}

export async function fetchServiceIdsForLocation(
  supabase: LocationSupabase,
  locationId: string,
): Promise<{ data: string[]; error: LocationQueryError; tablePresent: boolean }> {
  const { data, error } = await asRows<{ service_id: string }>(
    supabase.from("location_service").select("service_id").eq("location_id", locationId),
  );
  if (error) {
    return {
      data: [],
      error,
      tablePresent: !isMissingSchemaError(error),
    };
  }
  return {
    data: data.map((row) => row.service_id).filter(Boolean),
    error: null,
    tablePresent: true,
  };
}

/**
 * Shop menu from location_service.
 * - `null` → do not filter (no selected shop, or table missing)
 * - `[]` → shop has an empty menu
 * - `[ids]` → restrict the catalog to these services
 */
export async function offeredServiceIdsForLocation(
  supabase: LocationSupabase,
  locationId: string | null | undefined,
): Promise<string[] | null> {
  if (!locationId) return null;
  const offered = await fetchServiceIdsForLocation(supabase, locationId);
  if (!offered.tablePresent) return null;
  return offered.data;
}

export async function linkServiceToLocation(
  supabase: LocationSupabase,
  serviceId: string,
  locationId: string | null,
): Promise<{ error: LocationQueryError }> {
  if (!locationId) return { error: null };
  const { error } = await supabase.from("location_service").insert({
    service_id: serviceId,
    location_id: locationId,
  });
  if (error && isMissingSchemaError(error)) return { error: null };
  return { error };
}

export async function fetchStaffIdsForLocation(
  supabase: LocationSupabase,
  locationId: string,
): Promise<{ data: string[]; error: LocationQueryError; tablePresent: boolean }> {
  const { data, error } = await asRows<{ staff_id: string | null }>(
    supabase
      .from("location_membership")
      .select("staff_id")
      .eq("location_id", locationId)
      .eq("is_active", true),
  );
  if (error) {
    return {
      data: [],
      error,
      tablePresent: !isMissingSchemaError(error),
    };
  }
  return {
    data: data.map((row) => row.staff_id).filter((id): id is string => Boolean(id)),
    error: null,
    tablePresent: true,
  };
}

export async function resolveLocationStaffRoleId(
  supabase: LocationSupabase,
): Promise<{ roleId: string | null; error: LocationQueryError }> {
  const { data, error } = await asRows<{ id: string; name: string }>(
    supabase.from("role").select("id, name").eq("scope", "location").eq("is_system", true),
  );
  if (error) {
    if (isMissingSchemaError(error)) return { roleId: null, error: null };
    return { roleId: null, error };
  }
  return { roleId: pickLocationStaffRoleId(data), error: null };
}

/**
 * Attach a newly created staff row to the selected shop via
 * location_membership (stylist/staff system role). staff_id is always
 * set; user_id is set only when the staff already has a login.
 */
export async function linkStaffToLocation(
  supabase: LocationSupabase,
  staffId: string,
  locationId: string | null,
  userId?: string | null,
): Promise<{ error: LocationQueryError }> {
  if (!locationId) return { error: null };

  const role = await resolveLocationStaffRoleId(supabase);
  if (role.error) return { error: role.error };
  if (!role.roleId) {
    return { error: { message: "No location-scoped staff role found" } };
  }

  const { error } = await supabase.from("location_membership").insert(
    buildLocationMembershipInsert({
      locationId,
      roleId: role.roleId,
      staffId,
      userId,
    }),
  );
  if (error && isMissingSchemaError(error)) return { error: null };
  return { error };
}

