import Image from "next/image";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "h-9 w-auto" }: LogoProps) {
  return (
    <Image
      src="/gleami-wordmark.svg"
      alt="Gleami"
      width={108}
      height={36}
      className={className}
      priority
    />
  );
}
