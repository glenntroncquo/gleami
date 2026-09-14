import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

export default function RootPage() {
  // With localePrefix: "always", redirect to the default locale
  redirect(`/${defaultLocale}`);
}
