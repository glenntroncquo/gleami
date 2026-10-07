import React from 'react';

type LogoMarkProps = {
  className?: string;
  inverse?: boolean;
};

export function LogoMark({ className = 'h-7 w-7', inverse = false }: LogoMarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" className={inverse ? 'fill-white' : 'fill-ink'} />
      <path
        d="M21.5 11.2A7 7 0 1 0 23 17h-6.5"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inverse ? 'stroke-ink' : 'stroke-white'} />
      
      <circle cx="23.4" cy="8.8" r="1.9" className="fill-rose-400" />
    </svg>);

}