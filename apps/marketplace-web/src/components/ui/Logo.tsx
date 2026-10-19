type LogoProps = {
  inverse?: boolean;
  className?: string;
};

export function Logo({ inverse = false, className = "h-8 w-auto" }: LogoProps) {
  return (
    <img
      src={inverse ? "/gleami-wordmark-white.svg" : "/gleami-wordmark.svg"}
      alt="Gleami"
      width={96}
      height={32}
      className={className}
    />
  );
}
