import { copy } from "@/lib/copy";
import { marketplace } from "@/lib/marketplace";
import { Logo } from "@/components/Logo";

export function Header() {
  return (
    <header className="border-b border-transparent bg-page/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-5 md:px-8">
        <a
          href={marketplace.home}
          aria-label={copy.homeLabel}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
        >
          <Logo />
        </a>
        <nav aria-label={copy.navLabel} className="flex items-center gap-1 sm:gap-2">
          <a
            href={marketplace.business}
            className="hidden rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface md:inline-flex"
          >
            {copy.forBusiness}
          </a>
          <a
            href={marketplace.account}
            className="rounded-full px-4 py-2 text-[15px] font-medium text-navy transition-colors duration-150 hover:bg-surface"
          >
            {copy.login}
          </a>
        </nav>
      </div>
    </header>
  );
}
