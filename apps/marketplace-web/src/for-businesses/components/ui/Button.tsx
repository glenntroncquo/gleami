import React from 'react';
import { ArrowRightIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'inverse' | 'inverseOutline' | 'text';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
};

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink-soft focus-visible:ring-offset-canvas',
  secondary: 'bg-white text-ink ring-1 ring-inset ring-line-strong hover:ring-ink/30 hover:bg-white',
  inverse: 'bg-white text-ink hover:bg-canvas focus-visible:ring-offset-ink',
  inverseOutline: 'text-white ring-1 ring-inset ring-white/25 hover:ring-white/60 focus-visible:ring-offset-ink',
  text: 'text-ink hover:text-rose-700 px-0'
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-12 px-6 text-[16px]'
};

export function Button({
  variant = 'primary',
  size = 'md',
  arrow = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <a
      className={`group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 ${variants[variant]} ${variant === 'text' ? 'h-auto text-[15px]' : sizes[size]} ${className}`}
      {...rest}>
      
      {children}
      {arrow &&
      <ArrowRightIcon
        className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
        aria-hidden="true" />

      }
    </a>);

}