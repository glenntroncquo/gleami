import React from 'react';
import { AutomationFeed } from './AutomationFeed';
import { automationTasks } from '../../data/automation';

export function AutomationSection() {
  return (
    <section id="automation" aria-labelledby="automation-title" className="py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:px-8 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-[15px] font-medium text-rose-600">Automation</p>
          <h2
            id="automation-title"
            className="mt-3 text-balance text-[34px] font-semibold leading-[1.06] tracking-tightest text-ink md:text-[44px]">
            
            The admin quietly takes care of itself.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted md:text-[18px]">
            Gleami handles the repetitive work in the background, so confirmations, reminders and updates go out without anyone reaching for their phone.
          </p>
          <ul className="mt-8 space-y-3">
            {automationTasks.map((task) =>
            <li key={task} className="flex items-center gap-3 text-[16px] text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" aria-hidden="true" />
                {task}
              </li>
            )}
          </ul>
        </div>
        <AutomationFeed />
      </div>
    </section>);

}