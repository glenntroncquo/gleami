import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentView } from "@/components/DocumentView";
import { documentBySlug, documentPath, documents } from "@/content/documents";

export function generateStaticParams() {
  return documents.map((document) => ({ slug: document.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const document = documentBySlug(slug);
  if (!document) return {};
  return {
    title: document.nav,
    description: document.summary,
    alternates: { canonical: documentPath(document.id) },
  };
}

export default async function DocumentPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const document = documentBySlug(slug);
  if (!document) notFound();

  return (
    <main id="main">
      <DocumentView id={document.id} />
    </main>
  );
}
