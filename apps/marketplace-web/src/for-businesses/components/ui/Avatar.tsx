import React from 'react';
import { toneClasses, type Tone } from '../../utils/tones';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type AvatarProps = {
  name: string;
  tone?: Tone;
  size?: AvatarSize;
  className?: string;
};

const sizes: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-12 w-12 text-[15px]',
  xl: 'h-16 w-16 text-[20px]'
};

export function Avatar({ name, tone = 'neutral', size = 'md', className = '' }: AvatarProps) {
  const t = toneClasses[tone];
  const initials = name.
  split(' ').
  map((part) => part[0]).
  slice(0, 2).
  join('');
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${t.solid} ${t.text} ${sizes[size]} ${className}`}>
      
      {initials}
    </span>);

}