/**
 * Optios client importer — local operator tool.
 *
 * Replaces the former `optios-client-import` edge function, which ran with the
 * service-role key and no caller authentication. There is no HTTP surface here:
 * the only way to run it is with direct shell access and the service-role key.
 *
 * Usage:
 *   cd backend/supabase
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx ts-node scripts/optios/import-clients.ts \
 *       --company <company-uuid> --file ./optios-export.json [--batch 50] [--dry-run]
 *
 * Input file shape (an Optios customer export):
 *   { "customers": [ { "first_name", "last_name", "email", "phone_mobile", "phone_home" } ] }
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH = 500;

type OptiosCustomer = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_mobile?: string | null;
  phone_home?: string | null;
};

type Args = {
  companyId: string;
  file: string;
  batchSize: number;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };

  const companyId = get("--company");
  const file = get("--file");
  const batchRaw = get("--batch") ?? "50";
  const dryRun = argv.includes("--dry-run");

  if (!companyId || !UUID_RE.test(companyId)) {
    throw new Error("--company must be a company UUID");
  }
  if (!file) {
    throw new Error("--file must point at an Optios customer export JSON file");
  }

  // The edge function accepted `batchSize` unvalidated; a negative value made the
  // batching loop run forever.
  const batchSize = Number.parseInt(batchRaw, 10);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH) {
    throw new Error(`--batch must be an integer between 1 and ${MAX_BATCH}`);
  }

  return { companyId, file, batchSize, dryRun };
}

function readCustomers(file: string): OptiosCustomer[] {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const customers = Array.isArray(parsed) ? parsed : parsed?.customers;
  if (!Array.isArray(customers)) {
    throw new Error("Export file must be an array, or an object with a `customers` array");
  }
  return customers;
}

async function main(): Promise<void> {
  const { companyId, file, batchSize, dryRun } = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: primaryLocation, error: locationError } = await supabase
    .from("location")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_primary", true)
    .maybeSingle();

  if (locationError) {
    throw new Error(`Could not resolve primary location: ${locationError.message}`);
  }
  if (!primaryLocation?.id) {
    throw new Error(`Company ${companyId} has no primary location; cannot link clients.`);
  }
  const primaryLocationId = primaryLocation.id as string;

  const customers = readCustomers(file);

  const rows = customers
    .map((customer) => ({
      first_name: customer.first_name ?? "",
      last_name: customer.last_name ?? "",
      email: (customer.email ?? "").trim().toLowerCase(),
      phone: customer.phone_mobile || customer.phone_home || "",
    }))
    .filter((row) => row.email.length > 0);

  const seen = new Set<string>();
  const deduped = rows.filter((row) => {
    if (seen.has(row.email)) return false;
    seen.add(row.email);
    return true;
  });

  console.log(
    `Company ${companyId} -> primary location ${primaryLocationId}\n` +
      `${customers.length} records in file, ${rows.length} with an email, ${deduped.length} unique.`,
  );

  if (dryRun) {
    console.log("--dry-run set, stopping before any write.");
    return;
  }

  let upserted = 0;
  let linked = 0;
  const errors: string[] = [];

  for (let i = 0; i < deduped.length; i += batchSize) {
    const batch = deduped.slice(i, i + batchSize);
    const batchNo = Math.floor(i / batchSize) + 1;

    const { error: upsertError } = await supabase
      .from("client")
      .upsert(batch, { onConflict: "email", ignoreDuplicates: true });

    if (upsertError) {
      errors.push(`batch ${batchNo} upsert: ${upsertError.message}`);
      continue;
    }
    upserted += batch.length;

    const { data: existing, error: fetchError } = await supabase
      .from("client")
      .select("id")
      .in(
        "email",
        batch.map((row) => row.email),
      );

    if (fetchError) {
      errors.push(`batch ${batchNo} id lookup: ${fetchError.message}`);
      continue;
    }

    const links = (existing ?? []).map((client) => ({
      client_id: client.id as string,
      location_id: primaryLocationId,
    }));

    if (links.length === 0) continue;

    const { data: linkData, error: linkError } = await supabase
      .from("client_location")
      .upsert(links, { onConflict: "client_id,location_id", ignoreDuplicates: true })
      .select("client_id");

    if (linkError) {
      errors.push(`batch ${batchNo} client_location: ${linkError.message}`);
      continue;
    }
    linked += linkData?.length ?? 0;

    console.log(`batch ${batchNo}: ${batch.length} clients, ${linkData?.length ?? 0} new links`);
  }

  console.log(
    `\nDone. ${upserted} client rows processed, ${linked} new client_location links, ${errors.length} errors.`,
  );
  for (const error of errors) console.error(`  ${error}`);
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
