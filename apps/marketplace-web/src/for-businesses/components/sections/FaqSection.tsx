import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PlusIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { faqs } from '../../data/faq';
import { ctaLinks } from '../../data/navigation';
import { easeOut } from '../../utils/motion';

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 md:py-36">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="text-[15px] font-medium text-rose-600">FAQ</p>
            <h2
              id="faq-title"
              className="mt-3 text-[38px] font-semibold leading-[1.04] tracking-tightest text-ink md:text-[52px]">
              
              Questions, answered.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-muted">
              Can’t find what you’re looking for? We’re happy to walk you through Gleami.
            </p>
            <div className="mt-8">
              <Button href={ctaLinks.bookDemo} variant="secondary" arrow>
                Book a demo
              </Button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8">
          <ul className="border-t border-line">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              const panelId = `faq-panel-${i}`;
              const buttonId = `faq-button-${i}`;
              return (
                <li key={faq.question} className="border-b border-line">
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500">
                      
                      <span className="text-[18px] font-medium tracking-tight text-ink md:text-[20px]">{faq.question}</span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-out ${isOpen ? 'rotate-45 bg-ink text-white' : 'bg-shell text-ink group-hover:bg-line'}`}>
                        
                        <PlusIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen &&
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: easeOut }}
                      className="overflow-hidden">
                      
                        <div className="max-w-2xl pb-6 pr-12">
                          {faq.placeholder &&
                        <span className="mb-2 inline-block rounded-full bg-sand-50 px-2.5 py-0.5 text-[12px] font-medium text-sand-700">
                              Placeholder — confirm before publishing
                            </span>
                        }
                          <p className="text-[16px] leading-relaxed text-muted">{faq.answer}</p>
                        </div>
                      </motion.div>
                    }
                  </AnimatePresence>
                </li>);

            })}
          </ul>
        </div>
      </div>
    </section>);

}