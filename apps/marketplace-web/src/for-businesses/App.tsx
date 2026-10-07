import React from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/sections/Hero';
import { TrustStrip } from './components/sections/TrustStrip';
import { PlatformOverview } from './components/sections/PlatformOverview';
import { BookingSection } from './components/sections/BookingSection';
import { CalendarSection } from './components/sections/CalendarSection';
import { ClientsSection } from './components/sections/ClientsSection';
import { TeamSection } from './components/sections/TeamSection';
import { PaymentsSection } from './components/sections/PaymentsSection';
import { MarketplaceSection } from './components/sections/MarketplaceSection';
import { PresenceSection } from './components/sections/PresenceSection';
import { AnalyticsSection } from './components/sections/AnalyticsSection';
import { AutomationSection } from './components/sections/AutomationSection';
import { MobileSection } from './components/sections/MobileSection';
import { PricingSection } from './components/sections/PricingSection';
import { TestimonialsSection } from './components/sections/TestimonialsSection';
import { FaqSection } from './components/sections/FaqSection';
import { FinalCta } from './components/sections/FinalCta';

export function App() {
  return (
    <div id="top" className="min-h-screen w-full bg-canvas font-sans text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <TrustStrip />
        <PlatformOverview />
        <BookingSection />
        <CalendarSection />
        <ClientsSection />
        <TeamSection />
        <PaymentsSection />
        <MarketplaceSection />
        <PresenceSection />
        <AnalyticsSection />
        <AutomationSection />
        <MobileSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </div>);

}