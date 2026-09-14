import { supabase } from "../../supabase";

const LIVE_SALONFLOW_REF = "kvhinnhnwgvdpzggdnxs";

export async function cleanDatabase() {
  const url = process.env.SUPABASE_URL ?? "";
  if (url.includes(LIVE_SALONFLOW_REF)) {
    throw new Error(
      "Refusing to cleanDatabase against live SalonFlow. Point tests at a branch/test project.",
    );
  }

  // Tables without id column (junction tables) - clean first due to foreign key constraints
  const junctionTables = [
    "client_location",
    "staff_treatment",
    "staff_price_option",
  ];

  // Tables with id column
  const tablesWithId = [
    "appointment",
    "availability",
    "client_notes", 
    "client",
    "price_option",
    "staff",
    "treatment",
    "company",
    "subscriptions",
    "invitation"
  ];
  
  // Clean junction tables first
  for (const table of junctionTables) {
    try {
      // For junction tables, we need to delete all rows but they don't have 'id' column
      // Use a different approach - delete where any column is not null
      let deleteQuery;
      if (table === "client_location") {
        deleteQuery = supabase.from(table).delete().not("client_id", "is", null);
      } else if (table === "staff_treatment") {
        deleteQuery = supabase.from(table).delete().not("staff_id", "is", null);
      } else if (table === "staff_price_option") {
        deleteQuery = supabase.from(table).delete().not("staff_id", "is", null);
      }
      
      const { error: deleteError } = await deleteQuery;
      
      if (deleteError) {
        console.error(`Failed to delete from ${table}:`, deleteError.message);
        continue;
      }
    } catch (error) {
      console.error(`Error cleaning table ${table}:`, error);
      continue;
    }
  }

  // Clean tables with id column
  for (const table of tablesWithId) {
    try {
      const { error: deleteError } = await supabase.from(table).delete().not("id", "is", null);
      
      if (deleteError) {
        console.error(`Failed to delete from ${table}:`, deleteError.message);
        continue;
      }
    } catch (error) {
      console.error(`Error cleaning table ${table}:`, error);
      continue;
    }
  }
}
