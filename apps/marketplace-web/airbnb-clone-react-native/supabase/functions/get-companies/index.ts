import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  try {
    const { createClient } = await import("jsr:@supabase/supabase-js@2");

    // Get parameters from request body
    const { lat, long, search_term } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query with optional search filter
    let query = supabase
      .from("company")
      .select("id, name, city, street, postal_code, geo_location");

    // Add search term filter if provided
    if (search_term && search_term.trim() !== "") {
      query = query.or(
        `name.ilike.%${search_term}%,city.ilike.%${search_term}%,street.ilike.%${search_term}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
