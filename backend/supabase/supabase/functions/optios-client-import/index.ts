import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (req.method === "POST") {
      const requestBody = await req.json();
      const customerData = requestBody.customerData;
      const companyId = requestBody.companyId;
      const batchSize = requestBody.batchSize || 50;

      if (!customerData || !customerData.customers || !Array.isArray(customerData.customers)) {
        return new Response(
          JSON.stringify({
            error: "Invalid request body. Expected customerData with customers array.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!companyId) {
        return new Response(
          JSON.stringify({
            error: "Missing companyId. Please provide the company_id for the location link.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: primaryLocation, error: primaryLocationError } = await supabase
        .from("location")
        .select("id")
        .eq("company_id", companyId)
        .eq("is_primary", true)
        .maybeSingle();

      if (primaryLocationError || !primaryLocation?.id) {
        return new Response(
          JSON.stringify({
            error: "Primary location missing for company. Cannot write client_location.",
            details: primaryLocationError?.message ?? null,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const primaryLocationId = primaryLocation.id;

      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      let joinTableSuccessCount = 0;
      let joinTableErrorCount = 0;
      const errors: string[] = [];
      const duplicateEmails: string[] = [];
      const globalSeenEmails = new Set<string>();

      for (let i = 0; i < customerData.customers.length; i += batchSize) {
        const batch = customerData.customers.slice(i, i + batchSize);
        const transformedCustomers = batch
          .map((customer) => ({
            first_name: customer.first_name || "",
            last_name: customer.last_name || "",
            email: customer.email || "",
            phone: customer.phone_mobile || customer.phone_home || "",
            is_blocked: customer.is_online_booking_blocked || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          .filter((customer) => customer.email);

        const batchSeenEmails = new Set<string>();
        const deduplicatedCustomers = transformedCustomers.filter((customer) => {
          const emailLower = customer.email.toLowerCase();
          if (batchSeenEmails.has(emailLower)) {
            duplicateEmails.push(customer.email);
            return false;
          }
          batchSeenEmails.add(emailLower);
          if (globalSeenEmails.has(emailLower)) {
            duplicateEmails.push(customer.email);
            return false;
          }
          return true;
        });

        if (deduplicatedCustomers.length === 0) {
          continue;
        }

        try {
          const { data: customerInsertData, error: customerError } = await supabase
            .from("client")
            .upsert(deduplicatedCustomers, {
              onConflict: "email",
              ignoreDuplicates: true,
            })
            .select("id, email, first_name, last_name");

          if (customerError) {
            console.error("Customer batch error:", customerError);
            errors.push(`Batch ${Math.floor(i / batchSize) + 1} - Customers: ${customerError.message}`);
            errorCount += batch.length;
            continue;
          }

          const actualInserts = customerInsertData ? customerInsertData.length : 0;
          const dbDuplicates = deduplicatedCustomers.length - actualInserts;

          deduplicatedCustomers.forEach((customer) => {
            globalSeenEmails.add(customer.email.toLowerCase());
          });

          if (dbDuplicates > 0) {
            const dbDuplicateEmails = deduplicatedCustomers.slice(actualInserts).map((c) => c.email);
            duplicateEmails.push(...dbDuplicateEmails);
          }

          successCount += actualInserts;
          const withinBatchDuplicates = transformedCustomers.length - deduplicatedCustomers.length;
          duplicateCount += dbDuplicates + withinBatchDuplicates;

          const allBatchEmails = deduplicatedCustomers.map((c) => c.email);
          const { data: existingCustomers, error: fetchError } = await supabase
            .from("client")
            .select("id, email")
            .in("email", allBatchEmails);

          if (fetchError) {
            console.error("Error fetching customer IDs:", fetchError);
            errors.push(`Batch ${Math.floor(i / batchSize) + 1} - Fetch IDs: ${fetchError.message}`);
            joinTableErrorCount += allBatchEmails.length;
          } else {
            const clientLocationRecords = (existingCustomers ?? []).map((customer) => ({
              client_id: customer.id,
              location_id: primaryLocationId,
              created_at: new Date().toISOString(),
            }));

            if (clientLocationRecords.length > 0) {
              const { data: joinData, error: joinError } = await supabase
                .from("client_location")
                .upsert(clientLocationRecords, {
                  onConflict: "client_id,location_id",
                  ignoreDuplicates: true,
                })
                .select("client_id, location_id");

              if (joinError) {
                console.error("Join table error:", joinError);
                errors.push(`Batch ${Math.floor(i / batchSize) + 1} - Join table: ${joinError.message}`);
                joinTableErrorCount += clientLocationRecords.length;
              } else {
                const joinInserts = joinData ? joinData.length : 0;
                joinTableSuccessCount += joinInserts;
                console.log(
                  `Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(customerData.customers.length / batchSize)}: ${actualInserts} customers inserted, ${dbDuplicates} DB duplicates, ${withinBatchDuplicates} batch duplicates, ${joinInserts} client-location links created`,
                );
              }
            }
          }
        } catch (batchError) {
          console.error("Batch processing error:", batchError);
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${batchError.message}`);
          errorCount += batch.length;
          continue;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          summary: {
            totalCustomers: customerData.customers.length,
            successfulImports: successCount,
            duplicatesSkipped: duplicateCount,
            failedImports: errorCount,
            clientLocationLinksCreated: joinTableSuccessCount,
            clientLocationLinksFailed: joinTableErrorCount,
            companyId,
            primaryLocationId,
            duplicateEmails,
            errors,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          message: "Customer Migration Edge Function",
          usage: "POST with customerData in body",
          example: {
            customerData: {
              customers: [
                {
                  id: 127004398,
                  uuid: "2fa2a220-16bd-4710-8154-58a1a1685dfe",
                  first_name: "Alegria",
                  last_name: "Smekens",
                  email: "alegriake@hotmail.com",
                  phone_mobile: "+32472200910",
                  phone_home: null,
                  is_online_booking_blocked: false,
                },
              ],
            },
            companyId: "uuid-of-company-here",
            batchSize: 50,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
