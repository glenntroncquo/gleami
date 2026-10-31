import { z } from "npm:zod@^4.3.6";
import type { McpServer } from "npm:@modelcontextprotocol/server@^2.0.0";
import { loadShops, runTool, shopPermissions, type UserDb } from "../db.ts";

type Membership = {
  source: string;
  company_id: string;
  location_id: string | null;
  role_name: string;
};

export function registerWhoami(server: McpServer, db: UserDb) {
  server.registerTool(
    "whoami",
    {
      title: "Who is signed in",
      description: "Use this when you need the signed-in staff member, their shops, timezones, roles, or permissions. Call this before guessing which shop they mean.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    () => runTool(async () => {
      const userResult = await db.auth.getUser();
      if (userResult.error || !userResult.data.user) throw new Error("Sign in required.");
      const { data, error } = await db.rpc("my_memberships");
      if (error) throw new Error(error.message);
      const memberships = (Array.isArray(data) ? data : []) as Membership[];
      const shops = await loadShops(db);
      const lines = [`Signed in as ${userResult.data.user.email ?? userResult.data.user.id}`];
      if (shops.length === 0) {
        lines.push("This login cannot open a shop.");
        return lines.join("\n");
      }
      for (const shop of shops) {
        const locationRole = memberships.find((row) => row.location_id === shop.id)?.role_name;
        const companyRole = memberships.find((row) => row.source === "company" && row.company_id === shop.companyId)?.role_name;
        const role = locationRole ?? companyRole ?? "member";
        const permissions = await shopPermissions(db, shop.id);
        lines.push(`${shop.name} · ${shop.timezone} · ${role}`);
        lines.push(`permissions: ${permissions.join(", ") || "none"}`);
        lines.push(`id: ${shop.id}`);
      }
      return lines.join("\n");
    }),
  );
}
