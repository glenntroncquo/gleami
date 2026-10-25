import Link from "next/link";
import { documentPath, type DocId } from "@/content/documents";
import { Logo } from "@/components/Logo";
import { copy } from "@/lib/copy";
import { marketplace } from "@/lib/marketplace";

const legalLinks: Array<{ id: DocId; label: string }> = [
  { id: "privacy", label: copy.footer.privacy },
  { id: "terms", label: copy.footer.terms },
  { id: "service", label: copy.footer.service },
  { id: "data", label: copy.footer.data },
  { id: "cookies", label: copy.footer.cookies },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <a href={marketplace.home} aria-label={copy.homeLabel}>
              <Logo />
            </a>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
              {copy.footer.description}
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.marketplace}</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href={marketplace.salons} className="text-[14px] text-muted hover:text-ink">
                    {copy.footer.salons}
                  </a>
                </li>
                <li>
                  <a href={marketplace.treatments} className="text-[14px] text-muted hover:text-ink">
                    {copy.footer.treatments}
                  </a>
                </li>
                <li>
                  <a href={marketplace.city} className="text-[14px] text-muted hover:text-ink">
                    {copy.footer.city}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.company}</p>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <a href={marketplace.blog} className="text-[14px] text-muted hover:text-ink">
                    {copy.footer.blog}
                  </a>
                </li>
                <li>
                  <a href={marketplace.business} className="text-[14px] text-muted hover:text-ink">
                    {copy.forBusiness}
                  </a>
                </li>
                <li>
                  <a href={`${marketplace.business}#product`} className="text-[14px] text-muted hover:text-ink">
                    {copy.footer.product}
                  </a>
                </li>
                <li>
                  <a href={`${marketplace.business}#faq`} className="text-[14px] text-muted hover:text-ink">
                    {copy.footer.faq}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[14px] font-semibold">{copy.footer.legal}</p>
              <ul className="mt-4 space-y-2.5">
                {legalLinks.map((item) => (
                  <li key={item.id}>
                    <Link href={documentPath(item.id)} className="text-[14px] text-muted hover:text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-16 border-t border-line pt-8 text-[13px] text-muted">
          <p>
            © {new Date().getFullYear()} Gleami. {copy.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
