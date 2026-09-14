import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/calendar`);
  } else {
    redirect(`/${locale}/login`);
  }
}
