import React from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { FeatureExplorer } from './FeatureExplorer';

export function PlatformOverview() {
  return (
    <section id="product" aria-labelledby="product-title" className="bg-white py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="product-title"
          align="split"
          title="One platform. Your entire salon."
          description="No more juggling a scheduling app, a client spreadsheet and a separate payment tool. Gleami brings every part of your salon together, so the day runs from one calm, connected place." />
        
        <div className="mt-16 md:mt-24">
          <FeatureExplorer />
        </div>
      </div>
    </section>);

}