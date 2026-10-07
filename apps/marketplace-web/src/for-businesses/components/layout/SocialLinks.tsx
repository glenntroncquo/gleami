import React from 'react';

const socials = [
{
  label: 'Instagram',
  icon:
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>

},
{
  label: 'Facebook',
  icon:
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8.1v3h2.5V21h2.9z" />
      </svg>

},
{
  label: 'LinkedIn',
  icon:
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M6.9 8.8H3.8V20h3.1V8.8zM5.3 4a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM20.2 13.6c0-3-1.6-4.9-4.2-4.9-1.4 0-2.4.8-2.8 1.5V8.8h-3V20h3.1v-5.9c0-1.5.6-2.6 2-2.6 1.3 0 1.8 1 1.8 2.6V20h3.1v-6.4z" />
      </svg>

}];


export function SocialLinks() {
  return (
    <ul className="flex items-center gap-2">
      {socials.map((s) =>
      <li key={s.label}>
          <a
          href="#"
          aria-label={`${s.label} (link to be added)`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink/70 ring-1 ring-line transition-colors duration-150 ease-out hover:text-ink hover:ring-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
          
            {s.icon}
          </a>
        </li>
      )}
    </ul>);

}