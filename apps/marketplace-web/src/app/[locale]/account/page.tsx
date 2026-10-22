import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountView } from "@/components/account/AccountView";
import { isLocale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/account">;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Account",
};

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AccountView locale={locale} view="appointments" />;
}
