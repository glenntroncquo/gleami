import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
const text = (value: unknown, max = 240) => typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json(401, { error: "Sign in required" });
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json(401, { error: "Sign in required" });

  try {
    const body = await req.json();
    const step = Number(body.step);
    const data = body.data ?? {};
    if (![1, 2, 3, 4, 5, 6].includes(step)) return json(400, { error: "Invalid setup step" });

    let { data: setup, error } = await admin.from("company_setup").select("*").eq("user_id", user.id).maybeSingle();
    if (error) throw error;
    if (!setup && step !== 1) return json(409, { error: "Start setup at step 1" });
    if (!setup) {
      const name = text(data.businessName);
      if (!name) return json(400, { error: "Business name is required" });
      const { data: company, error: companyError } = await admin.from("company").insert({
        name,
        email: user.email ?? null,
        website: text(data.website, 500) || null,
      }).select("id").single();
      if (companyError) throw companyError;
      const { data: role, error: roleError } = await admin.from("role").select("id")
        .eq("name", "owner").eq("scope", "company").eq("is_system", true).single();
      if (roleError) {
        await admin.from("company").delete().eq("id", company.id);
        throw roleError;
      }
      const { error: membershipError } = await admin.from("company_membership").insert({
        user_id: user.id, company_id: company.id, role_id: role.id,
      });
      if (membershipError) {
        await admin.from("company").delete().eq("id", company.id);
        throw membershipError;
      }
      const { error: setupError } = await admin.from("company_setup").insert({
        user_id: user.id, company_id: company.id, current_step: 2,
        business_name: name, website: text(data.website, 500) || null,
      });
      if (setupError) {
        await admin.from("company").delete().eq("id", company.id);
        throw setupError;
      }
    } else if (step === 1) {
      const name = text(data.businessName);
      if (!name) return json(400, { error: "Business name is required" });
      const { error: companyUpdateError } = await admin.from("company").update({ name, website: text(data.website, 500) || null }).eq("id", setup.company_id);
      if (companyUpdateError) throw companyUpdateError;
      const { error: saveError } = await admin.from("company_setup").update({
        business_name: name, website: text(data.website, 500) || null, current_step: 2,
      }).eq("user_id", user.id);
      if (saveError) throw saveError;
    } else if (step === 2 || step === 3) {
      const patch = step === 2
        ? { categories: Array.isArray(data.categories) ? data.categories.map((x: unknown) => text(x, 80)).slice(0, 3) : [], current_step: 3 }
        : { team_size: text(data.teamSize, 40), current_step: 4 };
      const { error: saveError } = await admin.from("company_setup").update(patch).eq("user_id", user.id);
      if (saveError) throw saveError;
    } else if (step === 4) {
      const address = data.address ?? {};
      const street = text(address.street), city = text(address.city), country = text(address.country);
      if (!street || !city || !country) return json(400, { error: "Street, city and country are required" });
      let locationId = setup.location_id;
      const locationData = {
        company_id: setup.company_id, name: setup.business_name, street, city,
        postal_code: text(address.postalCode) || null, state: text(address.state) || null,
        country, timezone: text(address.timezone, 80) || "Europe/Brussels",
        is_primary: true, is_active: true, is_listed: false,
      };
      if (locationId) {
        const { error: updateError } = await admin.from("location").update(locationData).eq("id", locationId);
        if (updateError) throw updateError;
      } else {
        const { data: location, error: locationError } = await admin.from("location").insert(locationData).select("id").single();
        if (locationError) throw locationError;
        locationId = location.id;
        let { data: staff, error: staffLookupError } = await admin.from("staff").select("id").eq("company_id", setup.company_id).eq("user_id", user.id).maybeSingle();
        if (staffLookupError) throw staffLookupError;
        if (!staff) {
          const metadata = user.user_metadata ?? {};
          const fullName = text(metadata.full_name ?? metadata.name, 160) || (user.email?.split("@")[0] ?? "Salon owner");
          const [firstName, ...lastParts] = fullName.split(/\s+/);
          const { data: createdStaff, error: createStaffError } = await admin.from("staff").insert({
            company_id: setup.company_id, user_id: user.id, email: user.email ?? "",
            first_name: text(metadata.given_name ?? metadata.first_name, 80) || firstName,
            last_name: text(metadata.family_name ?? metadata.last_name, 80) || lastParts.join(" ") || null,
            status: "Active",
          }).select("id").single();
          if (createStaffError) throw createStaffError;
          staff = createdStaff;
        }
        const { data: role, error: roleError } = await admin.from("role").select("id").eq("name", "stylist").eq("scope", "location").eq("is_system", true).single();
        if (roleError) throw roleError;
        const { error: linkError } = await admin.from("location_membership").upsert({
          user_id: user.id, location_id: locationId, staff_id: staff.id, role_id: role.id, is_active: true,
        }, { onConflict: "user_id,location_id" });
        if (linkError) throw linkError;
      }
      const { error: saveError } = await admin.from("company_setup").update({
        location_id: locationId, address, current_step: 5,
      }).eq("user_id", user.id);
      if (saveError) throw saveError;
    } else if (step === 5) {
      const { error: saveError } = await admin.from("company_setup").update({
        current_software: text(data.software, 100), current_step: 6,
      }).eq("user_id", user.id);
      if (saveError) throw saveError;
    } else {
      const { error: saveError } = await admin.from("company_setup").update({
        opening_hours: data.openingHours ?? {}, current_step: 5, completed_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      if (saveError) throw saveError;
    }
    const { data: result, error: resultError } = await admin.from("company_setup").select("*").eq("user_id", user.id).single();
    if (resultError) throw resultError;
    return json(200, { setup: result });
  } catch (error) {
    console.error("salon-setup-save", error);
    return json(500, { error: "Could not save setup" });
  }
});
