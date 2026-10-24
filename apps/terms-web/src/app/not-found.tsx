import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LegalNav } from "@/components/LegalNav";

export default function NotFound() {
  return (
    <>
      <div className="sticky top-0 z-30">
        <Header />
        <LegalNav />
      </div>
      <main id="main" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <h1 className="text-[32px] font-semibold tracking-tight">Pagina niet gevonden</h1>
        <p className="mt-3 text-[15px] text-muted">Deze pagina bestaat niet in de juridische documenten.</p>
        <Link href="/nl-be" className="mt-6 inline-flex text-[15px] font-medium text-peri">
          Terug naar het overzicht
        </Link>
      </main>
      <Footer />
    </>
  );
}
