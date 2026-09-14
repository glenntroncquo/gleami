/**
 * Persist catalog variant removal against `service_variant` only.
 * Soft-delete when order/appointment history still references the row.
 * Hard-delete when unused. Never touch the dropped `price_option` table.
 */

export const SERVICE_VARIANT_TABLE = "service_variant";

export const VARIANT_HISTORY_TABLES = [
  "order_item",
  "appointment_segment",
] as const;

export const VARIANT_SOFT_DELETE_PATCH = {
  is_deleted: true,
  is_active: false,
} as const;

export const VARIANT_DELETE_FAILED_MESSAGE =
  "Failed to delete removed variants.";

export type VariantRemovalAction = "hard-delete" | "soft-delete";

export function variantRemovalAction(
  hasHistoryReference: boolean,
): VariantRemovalAction {
  return hasHistoryReference ? "soft-delete" : "hard-delete";
}

export function collectReferencedVariantIds(
  rows: Array<{ service_variant_id?: string | null } | null | undefined>,
): Set<string> {
  const referenced = new Set<string>();
  for (const row of rows) {
    const id = row?.service_variant_id;
    if (id) referenced.add(id);
  }
  return referenced;
}

export type VariantRemovalError = { message: string };

export type VariantRemovalStore = {
  findHistoryReferences: (
    variantIds: string[],
  ) => Promise<
    | { ids: Set<string>; error: null }
    | { ids?: undefined; error: VariantRemovalError }
  >;
  hardDelete: (
    variantIds: string[],
  ) => Promise<{ error: VariantRemovalError | null }>;
  softDelete: (
    variantIds: string[],
  ) => Promise<{ error: VariantRemovalError | null }>;
};

export type RemoveServiceVariantsResult = {
  error: VariantRemovalError | null;
  hardDeleted: string[];
  softDeleted: string[];
};

function asError(error: { message?: string } | null | undefined): VariantRemovalError | null {
  if (!error) return null;
  return { message: error.message || VARIANT_DELETE_FAILED_MESSAGE };
}

export async function removeServiceVariants(
  variantIds: string[],
  store: VariantRemovalStore,
): Promise<RemoveServiceVariantsResult> {
  const ids = [...new Set(variantIds.filter(Boolean))];
  if (ids.length === 0) {
    return { error: null, hardDeleted: [], softDeleted: [] };
  }

  const referenced = await store.findHistoryReferences(ids);
  if (referenced.error) {
    return { error: referenced.error, hardDeleted: [], softDeleted: [] };
  }

  const softIds = ids.filter((id) => referenced.ids.has(id));
  const hardIds = ids.filter((id) => !referenced.ids.has(id));
  const hardDeleted: string[] = [];
  const softDeleted: string[] = [];

  if (hardIds.length > 0) {
    const hardResult = await store.hardDelete(hardIds);
    if (hardResult.error) {
      const fallback = await store.softDelete(hardIds);
      if (fallback.error) {
        return {
          error: fallback.error,
          hardDeleted,
          softDeleted,
        };
      }
      softDeleted.push(...hardIds);
    } else {
      hardDeleted.push(...hardIds);
    }
  }

  if (softIds.length > 0) {
    const softResult = await store.softDelete(softIds);
    if (softResult.error) {
      return { error: softResult.error, hardDeleted, softDeleted };
    }
    softDeleted.push(...softIds);
  }

  return { error: null, hardDeleted, softDeleted };
}

type VariantCatalogTable =
  | typeof SERVICE_VARIANT_TABLE
  | (typeof VARIANT_HISTORY_TABLES)[number]
  | "service_variant_phase"
  | "staff_service_variant";

type CatalogQueryBuilder = {
  select: (columns: string) => {
    in: (
      column: string,
      values: string[],
    ) => PromiseLike<{
      data: Array<{ service_variant_id?: string | null }> | null;
      error: { message?: string } | null;
    }>;
  };
  delete: () => {
    in: (
      column: string,
      values: string[],
    ) => PromiseLike<{ error: { message?: string } | null }>;
  };
  update: (values: typeof VARIANT_SOFT_DELETE_PATCH) => {
    in: (
      column: string,
      values: string[],
    ) => PromiseLike<{ error: { message?: string } | null }>;
  };
};

type CatalogQueryClient = {
  from: (table: VariantCatalogTable) => CatalogQueryBuilder;
};

async function deleteOwnedVariantRows(
  supabase: CatalogQueryClient,
  table: Extract<VariantCatalogTable, "service_variant_phase" | "staff_service_variant">,
  variantIds: string[],
): Promise<{ error: VariantRemovalError | null }> {
  const { error } = await supabase
    .from(table)
    .delete()
    .in("service_variant_id", variantIds);
  return { error: asError(error) };
}

/**
 * Supabase adapter. Queries only service_variant plus history FKs.
 * Owned child rows (phases, staff assignments) are cleared before a hard delete.
 */
export function createSupabaseVariantRemovalStore(
  supabase: unknown,
): VariantRemovalStore {
  const client = supabase as CatalogQueryClient;
  return {
    async findHistoryReferences(variantIds) {
      const [orderItems, segments] = await Promise.all([
        client
          .from("order_item")
          .select("service_variant_id")
          .in("service_variant_id", variantIds),
        client
          .from("appointment_segment")
          .select("service_variant_id")
          .in("service_variant_id", variantIds),
      ]);

      if (orderItems.error) {
        return { error: asError(orderItems.error)! };
      }
      if (segments.error) {
        return { error: asError(segments.error)! };
      }

      return {
        ids: collectReferencedVariantIds([
          ...(orderItems.data || []),
          ...(segments.data || []),
        ]),
        error: null,
      };
    },
    async hardDelete(variantIds) {
      const phaseCleanup = await deleteOwnedVariantRows(
        client,
        "service_variant_phase",
        variantIds,
      );
      if (phaseCleanup.error) return phaseCleanup;

      const staffCleanup = await deleteOwnedVariantRows(
        client,
        "staff_service_variant",
        variantIds,
      );
      if (staffCleanup.error) return staffCleanup;

      const { error } = await client
        .from(SERVICE_VARIANT_TABLE)
        .delete()
        .in("id", variantIds);
      return { error: asError(error) };
    },
    async softDelete(variantIds) {
      const { error } = await client
        .from(SERVICE_VARIANT_TABLE)
        .update(VARIANT_SOFT_DELETE_PATCH)
        .in("id", variantIds);
      return { error: asError(error) };
    },
  };
}
