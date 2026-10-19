type LogoProps = {
  inverted?: boolean;
  className?: string;
};

export function Logo({ inverted = false, className = "h-9 w-auto" }: LogoProps) {
  return (
    <img
      src={inverted ? "/gleami-wordmark-white.svg" : "/gleami-wordmark.svg"}
      alt="Gleami"
      width={108}
      height={36}
      className={className}
    />
  );
}
