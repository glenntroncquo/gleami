import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MenuIcon, XIcon } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { ctaLinks, navLinks } from '../../data/navigation';
import { easeOut } from '../../utils/motion';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const elevated = scrolled || open;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color] duration-200 ease-out ${elevated ? 'border-line bg-canvas/90 backdrop-blur-md' : 'border-transparent bg-canvas'}`}>
      
      <nav aria-label="Main" className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <a
          href="#top"
          aria-label="Gleami home"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
          
          <Logo />
        </a>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
          {navLinks.map((link) =>
          <li key={link.label}>
              <a
              href={link.href}
              className="rounded-full px-3.5 py-2 text-[14px] text-ink/70 transition-colors duration-150 ease-out hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
              
                {link.label}
              </a>
            </li>
          )}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <a
            href={ctaLinks.login}
            className="rounded-full px-3.5 py-2 text-[14px] text-ink/70 transition-colors duration-150 ease-out hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
            
            Log in
          </a>
          <Button href={ctaLinks.getStarted} size="sm">
            Get started
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Button href={ctaLinks.getStarted} size="sm">
            Get started
          </Button>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
            
            {open ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open &&
        <motion.div
          id="mobile-menu"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: easeOut }}
          className="border-t border-line bg-canvas px-5 pb-8 pt-2 lg:hidden">
          
            <ul>
              {navLinks.map((link) =>
            <li key={link.label} className="border-b border-line">
                  <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-4 text-[20px] font-medium tracking-tight text-ink">
                
                    {link.label}
                  </a>
                </li>
            )}
            </ul>
            <div className="mt-6 grid gap-3">
              <Button href={ctaLinks.getStarted} size="lg" onClick={() => setOpen(false)}>
                Get started
              </Button>
              <Button href={ctaLinks.bookDemo} variant="secondary" size="lg" onClick={() => setOpen(false)}>
                Book a demo
              </Button>
              <a href={ctaLinks.login} className="py-2 text-center text-[15px] text-muted hover:text-ink">
                Log in
              </a>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </header>);

}