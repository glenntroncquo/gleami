import React from 'react';

type LogoProps = {
  inverse?: boolean;
};

export function Logo({ inverse = false }: LogoProps) {
  return (
    <span
      className={`relative inline-block pr-2 text-[26px] font-bold leading-none tracking-[-0.045em] ${inverse ? 'text-white' : 'text-ink'}`}>
      
      gleami
      <span className="absolute right-0 top-0 h-[7px] w-[7px] rounded-full bg-rose-400" aria-hidden="true" />
    </span>);

}