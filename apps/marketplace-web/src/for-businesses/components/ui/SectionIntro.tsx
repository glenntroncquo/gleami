import React from 'react';

type SectionIntroProps = {
  id?: string;
  label?: string;
  title: string;
  description?: string;
  align?: 'center' | 'left' | 'split';
  inverse?: boolean;
  children?: React.ReactNode;
};

export function SectionIntro({
  id,
  label,
  title,
  description,
  align = 'center',
  inverse = false,
  children
}: SectionIntroProps) {
  const labelEl = label ?
  <p className={`text-[15px] font-medium ${inverse ? 'text-rose-300' : 'text-rose-600'}`}>{label}</p> :
  null;
  const titleEl =
  <h2
    id={id}
    className={`text-balance text-[38px] font-semibold leading-[1.04] tracking-tightest md:text-[52px] lg:text-[64px] ${inverse ? 'text-white' : 'text-ink'} ${label ? 'mt-3' : ''}`}>
    
      {title}
    </h2>;

  const descEl = description ?
  <p
    className={`text-pretty text-[18px] leading-relaxed md:text-[20px] ${inverse ? 'text-white/70' : 'text-muted'}`}>
    
      {description}
    </p> :
  null;

  if (align === 'split') {
    return (
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
        <div className="lg:col-span-7">
          {labelEl}
          {titleEl}
        </div>
        <div className="lg:col-span-5 lg:pb-2">
          {descEl}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </div>);

  }

  const centered = align === 'center';
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      {labelEl}
      {titleEl}
      {descEl && <div className={`mt-5 ${centered ? 'mx-auto max-w-2xl' : ''}`}>{descEl}</div>}
      {children &&
      <div className={`mt-8 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>{children}</div>
      }
    </div>);

}