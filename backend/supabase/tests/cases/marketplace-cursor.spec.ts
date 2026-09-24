import { describe, expect, it } from "vitest";
import { decodeSearchCursor, encodeSearchCursor } from "../../supabase/functions/_shared/marketplace/cursor.ts";

describe("search cursor", () => {
  it("round-trips score and location id", () => {
    const cursor = encodeSearchCursor(12.345678, "11111111-1111-4111-8111-111111111111");
    expect(cursor).not.toContain("11111111");
    expect(decodeSearchCursor(cursor)).toEqual({
      score: 12.345678,
      locationId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("rejects tampered and non-opaque values", () => {
    expect(decodeSearchCursor("")).toBeNull();
    expect(decodeSearchCursor("not-a-cursor")).toBeNull();
    expect(decodeSearchCursor(encodeSearchCursor(Number.NaN, "11111111-1111-4111-8111-111111111111"))).toBeNull();
    const encoded = encodeSearchCursor(1, "not-a-uuid");
    expect(decodeSearchCursor(encoded)).toBeNull();
  });
});
