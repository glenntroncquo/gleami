import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dropSql = readFileSync(
  "supabase/migrations/20260906075929_drop_client_company.sql",
  "utf8",
);
const searchSql = readFileSync(
  "supabase/functions/client-search/sql/search_clients_by_company.sql",
  "utf8",
);
const clientRepo = readFileSync(
  "supabase/functions/_shared/client/repository.ts",
  "utf8",
);
const clientMapper = readFileSync(
  "supabase/functions/_shared/client/mapper.ts",
  "utf8",
);
const clientEntity = readFileSync(
  "supabase/functions/_shared/client/entity.ts",
  "utf8",
);
const generatedTypes = readFileSync("types/supabase-types.ts", "utf8");

const dropSqlBody = dropSql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

describe("client_company drop (final step)", () => {
  it("drops policies then the table, without CASCADE or recreating RPCs", () => {
    expect(dropSql).toContain("drop policy if exists");
    expect(dropSql).toContain("drop table if exists public.client_company");
    expect(dropSql).not.toMatch(/drop table if exists public\.client_company\s+cascade/i);
    expect(dropSqlBody).not.toMatch(/create or replace function/i);
    expect(dropSqlBody).not.toMatch(/\bchair/i);
    expect(dropSqlBody).not.toMatch(/\broom\b/i);
  });

  it("asserts to_regclass('public.client_company') is null", () => {
    expect(dropSql).toContain("to_regclass('public.client_company')");
    expect(dropSql).toContain("public.client_company still exists after drop");
  });

  it("asserts search / staff / referral RPCs still have no client_company refs", () => {
    expect(dropSql).toContain(
      "pg_get_functiondef('public.search_clients_by_company(text,uuid)'::regprocedure)",
    );
    expect(dropSql).toContain("search_clients_by_company still references client_company");
    expect(dropSql).toContain("create_appointment_staff still writes or reads client_company");
    expect(dropSql).toContain("create_appointment_with_referral still references client_company");
    expect(searchSql).not.toContain("client_company");
    expect(searchSql).toContain("client_location");
  });

  it("keeps isLinkedToCompany on client_location and removes unused linkToCompany", () => {
    expect(clientRepo).toContain("isLinkedToCompany");
    expect(clientRepo).toContain('from("client_location")');
    expect(clientRepo).toContain("location!inner(company_id)");
    expect(clientRepo).not.toContain("linkToCompany");
    expect(clientRepo).not.toContain('from("client_company")');
  });

  it("removes dead ClientCompany mapper / entity / generated types", () => {
    expect(clientMapper).not.toContain("toClientCompany");
    expect(clientMapper).not.toContain("ClientCompany");
    expect(clientEntity).not.toContain("ClientCompany");
    expect(generatedTypes).not.toContain("client_company:");
    expect(generatedTypes).not.toContain("client_company_client_id_fkey");
  });
});
