import React from 'react';
import { SectionIntro } from '../ui/SectionIntro';
import { ScaleToFit } from '../ui/ScaleToFit';
import { Reveal } from '../ui/Reveal';
import { TeamMockup } from '../mockups/TeamMockup';
import { teamAudiences } from '../../data/team';

export function TeamSection() {
  return (
    <section id="team" aria-labelledby="team-title" className="bg-white py-24 md:py-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <SectionIntro
          id="team-title"
          label="Team"
          title="Built for your whole team."
          description="Profiles, schedules, treatments and permissions for everyone who works in your salon — in one simple place." />
        
        <Reveal className="mx-auto mt-14 max-w-6xl md:mt-20">
          <div className="rounded-[20px] bg-shell p-1.5 md:rounded-[32px] md:p-3">
            <div className="overflow-hidden rounded-[15px] shadow-soft ring-1 ring-line md:rounded-[24px]">
              <ScaleToFit width={1080}>
                <TeamMockup />
              </ScaleToFit>
            </div>
          </div>
        </Reveal>
        <div className="mx-auto mt-14 grid max-w-5xl gap-10 md:grid-cols-2 md:gap-16">
          {teamAudiences.map((a) =>
          <div key={a.title}>
              <h3 className="text-[22px] font-semibold tracking-tight text-ink">{a.title}</h3>
              <p className="mt-3 text-[16px] leading-relaxed text-muted">{a.body}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}