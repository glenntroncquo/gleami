import React from "react";
import { LayoutGridIcon, StoreIcon, SearchIcon, CalendarCheckIcon, RefreshCwIcon, BoxIcon } from "lucide-react";
import { SectionIntro } from "../ui/SectionIntro";
import { PhoneFrame } from "../ui/PhoneFrame";
import { ScaleToFit } from "../ui/ScaleToFit";
import { Reveal } from "../ui/Reveal";
import { Button } from "../ui/Button";
import { MarketplaceMapScreen } from "../mockups/marketplace/MarketplaceMapScreen";
import { MarketplaceSalonScreen } from "../mockups/marketplace/MarketplaceSalonScreen";
import { flywheelSteps } from "../../data/marketplace";
import { ctaLinks } from "../../data/navigation";
const stepIcons: BoxIcon[] = [LayoutGridIcon, StoreIcon, SearchIcon, CalendarCheckIcon, RefreshCwIcon];
export function MarketplaceSection() {
  return <section id="marketplace" aria-labelledby="marketplace-title" className="overflow-hidden bg-ink py-24 text-white md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro id="marketplace-title" inverse label="Gleami marketplace" title="Get discovered by new clients." description="Gleami is more than salon software. Publish your salon to the Gleami marketplace, where people nearby discover salons, browse treatments and book available times.">
          <Button href={ctaLinks.getStarted} variant="inverse" size="lg" arrow>
            Publish your salon
          </Button>
        </SectionIntro>

        <div className="mt-16 flex items-start justify-center gap-4 sm:gap-8 md:mt-24 md:gap-12">
          <Reveal className="w-[46%] max-w-[272px]">
            <ScaleToFit width={272}>
              <PhoneFrame dark label="Gleami marketplace app: map with nearby salons, categories and search">
                <MarketplaceMapScreen />
              </PhoneFrame>
            </ScaleToFit>
          </Reveal>
          <Reveal delay={0.06} className="mt-16 w-[46%] max-w-[272px] md:mt-24">
            <ScaleToFit width={272}>
              <PhoneFrame dark label="Gleami marketplace app: salon detail page with treatments and available times">
                <MarketplaceSalonScreen />
              </PhoneFrame>
            </ScaleToFit>
          </Reveal>
        </div>
        <p className="mt-6 text-center text-[12px] text-white/50">Salon names, ratings and reviews shown are illustrative.</p>

        <div className="mt-20 md:mt-28">
          <h3 className="text-center text-[22px] font-semibold tracking-tight md:text-[28px]">How the marketplace works for you</h3>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-5 md:gap-6">
            <span className="absolute left-[10%] right-[10%] top-6 hidden h-px bg-white/15 md:block" aria-hidden="true" />
            {flywheelSteps.map((step, i) => {
            const Icon = stepIcons[i];
            const last = i === flywheelSteps.length - 1;
            return <li key={step.title} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                  <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${last ? 'bg-rose-300 text-ink' : 'bg-navy-800 text-white ring-1 ring-white/15'}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="md:mt-5">
                    <p className="text-[16px] font-semibold tracking-tight">{step.title}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-white/65">{step.body}</p>
                  </div>
                </li>;
          })}
          </ol>
        </div>
      </div>
    </section>;
}