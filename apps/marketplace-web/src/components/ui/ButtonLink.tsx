import Link, { type LinkProps } from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "inverse" | "outline" | "text";
type Size = "sm" | "md" | "lg";

type ButtonLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
    variant?: Variant;
    size?: Size;
    arrow?: boolean;
  };

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-white hover:bg-ink-soft focus-visible:ring-offset-canvas",
  secondary:
    "bg-white text-ink ring-1 ring-inset ring-line-strong hover:bg-canvas hover:ring-ink/30",
  inverse:
    "bg-white text-ink hover:bg-canvas focus-visible:ring-offset-ink",
  outline:
    "text-white ring-1 ring-inset ring-white/25 hover:ring-white/60 focus-visible:ring-offset-ink",
  text: "px-0 text-ink hover:text-rose-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[14px]",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-[16px]",
};

export function ButtonLink({
  children,
  variant = "primary",
  size = "md",
  arrow = false,
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`group inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 ${
        variants[variant]
      } ${variant === "text" ? "h-auto text-[15px]" : sizes[size]} ${className}`}
      {...props}
    >
      {children}
      {arrow ? (
        <ArrowRightIcon
          aria-hidden="true"
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        />
      ) : null}
    </Link>
  );
}
