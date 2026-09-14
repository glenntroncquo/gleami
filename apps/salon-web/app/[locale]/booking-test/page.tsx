import { getWidgetTheme } from "@/lib/booking-widget/queries";
import { BookingTestClient } from "./booking-test-client";

// Hardcoded company for local testing of the booking widget theme editor.
const TEST_COMPANY_ID = "b66720ac-dcb8-4051-b287-f8f8b6291cc0";

export default async function BookingTestPage() {
  const initialTheme = await getWidgetTheme(TEST_COMPANY_ID);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // In local dev the widget is served from a different origin, so accept "*".
  const targetOrigin =
    process.env.NODE_ENV === "development" ? "*" : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 lg:p-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Booking widget theme — test
        </h1>
        <p className="text-muted-foreground text-sm">
          Local test page for company{" "}
          <code className="text-xs">{TEST_COMPANY_ID}</code>. Adjust colors and
          watch the embedded widget update live.
        </p>
      </div>

      <BookingTestClient
        companyId={TEST_COMPANY_ID}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
        initialTheme={initialTheme}
        targetOrigin={targetOrigin}
      />
    </div>
  );
}
