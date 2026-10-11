import { Logo } from "./Logo";

const columns: Array<{ title: string; links: string[] }> = [
  { title: "Discover", links: ["Hair salons", "Barbers", "Nail salons", "Massage", "Skin clinics"] },
  { title: "Cities", links: ["London", "Manchester", "Bristol", "Edinburgh", "Brighton"] },
  { title: "Company", links: ["About", "Careers", "Help centre", "Privacy", "Terms"] },
];

export function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-ink-muted">The easiest way to book beauty and wellness near you.</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="text-sm font-semibold text-navy">{column.title}</h3>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link}>
                  <a href="#explore" className="text-[15px] text-ink-muted transition-colors duration-150 hover:text-navy">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-ink-faint md:flex-row md:justify-between md:px-8">
          <p>© 2026 Gleami. All rights reserved.</p>
          <p>Made for people who like to feel good.</p>
        </div>
      </div>
    </footer>
  );
}
