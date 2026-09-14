import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const searchSql = readFileSync(
  "supabase/functions/client-search/sql/search_clients_by_company.sql",
  "utf8",
);
const clientRepo = readFileSync(
  "supabase/functions/_shared/client/repository.ts",
  "utf8",
);
const optiosImport = readFileSync(
  "supabase/functions/optios-client-import/index.ts",
  "utf8",
);
const orderCreate = readFileSync(
  "supabase/functions/_shared/order/commands/create-with-payment/handler.ts",
  "utf8",
);

describe("client_company cutover (shared TS + snapshots)", () => {
  it("search snapshot scopes via client_location ⋈ location.company_id", () => {
    expect(searchSql).toContain("client_location");
    expect(searchSql).toContain("loc.company_id = p_company_id");
    expect(searchSql).not.toContain("client_company");
    expect(searchSql).not.toContain("is_active");
  });

  it("isLinkedToCompany uses client_location, not client_company", () => {
    expect(clientRepo).toContain("isLinkedToCompany");
    expect(clientRepo).toContain('from("client_location")');
    expect(clientRepo).toContain("location!inner(company_id)");
    expect(clientRepo).not.toContain('from("client_company")');
  });

  it("POS order-create still gates walk-in clients through isLinkedToCompany", () => {
    expect(orderCreate).toContain("isLinkedToCompany(requestClientId, company_id)");
  });

  it("optios-client-import upserts client_location and stops writing client_company", () => {
    expect(optiosImport).toContain('from("client_location")');
    expect(optiosImport).toContain("is_primary");
    expect(optiosImport).not.toContain('from("client_company")');
  });
});
