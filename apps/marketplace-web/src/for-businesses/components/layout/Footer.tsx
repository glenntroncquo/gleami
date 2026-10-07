import React, { useState } from 'react';
import { GlobeIcon, ChevronDownIcon } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { SocialLinks } from './SocialLinks';
import { footerColumns, languages } from '../../data/navigation';

export function Footer() {
  const [language, setLanguage] = useState('en');

  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted">
              The modern operating system for running a salon — from the first booking to the final payment.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <label className="relative inline-flex items-center">
                <span className="sr-only">Language</span>
                <GlobeIcon className="pointer-events-none absolute left-3 h-4 w-4 text-muted" aria-hidden="true" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="h-9 appearance-none rounded-full bg-white pl-9 pr-9 text-[14px] text-ink ring-1 ring-line transition-shadow duration-150 ease-out hover:ring-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                  
                  {languages.map((l) =>
                  <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  )}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-muted" aria-hidden="true" />
              </label>
              <SocialLinks />
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5 lg:col-span-8">
            {footerColumns.map((col) =>
            <div key={col.title}>
                <p className="text-[14px] font-semibold text-ink">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) =>
                <li key={link.label}>
                      <a
                    href={link.href}
                    className="text-[14px] text-muted transition-colors duration-150 ease-out hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                    
                        {link.label}
                      </a>
                    </li>
                )}
                </ul>
              </div>
            )}
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-8 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Gleami. All rights reserved.</p>
          <p>Salon names and data in product visuals are illustrative.</p>
        </div>
      </div>
    </footer>);

}