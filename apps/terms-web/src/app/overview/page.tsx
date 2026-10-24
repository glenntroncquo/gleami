import type { Metadata } from "next";
import { Overview } from "@/components/Overview";
import { overviewPath } from "@/content/documents";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.overview,
  description: "Gleami legal documents: terms, privacy, cookies and data protection.",
  alternates: { canonical: overviewPath },
};

export default function OverviewPage() {
  return (
    <main id="main">
      <Overview />
    </main>
  );
}
