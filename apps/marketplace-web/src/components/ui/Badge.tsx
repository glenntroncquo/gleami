import React from 'react';
import { toneClasses, type Tone } from '../../utils/tones';

type BadgeProps = {
  tone?: Tone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function Badge({ tone = 'neutral', dot = false, children, className = '' }: BadgeProps) {
  const t = toneClasses[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${t.soft} ${t.text} ${className}`}>
      
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>);

}