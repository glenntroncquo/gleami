import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountView } from "@/components/account/AccountView";
import { isLocale } from "@/lib/i18n";

type Props = PageProps<"/[locale]/account/favorieten">;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Favorieten",
};

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AccountView locale={locale} view="favorites" />;
}
