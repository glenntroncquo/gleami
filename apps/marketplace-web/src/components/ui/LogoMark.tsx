type LogoMarkProps = {
  className?: string;
  inverse?: boolean;
};

export function LogoMark({ className = "h-7 w-7", inverse = false }: LogoMarkProps) {
  return (
    <img
      src={inverse ? "/gleami-mark-white.svg" : "/gleami-mark.svg"}
      alt=""
      width={28}
      height={28}
      aria-hidden="true"
      className={`${className} object-contain`}
    />
  );
}
