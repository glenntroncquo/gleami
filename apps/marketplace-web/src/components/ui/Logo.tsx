import { LogoMark } from "@/components/ui/LogoMark";

type LogoProps = {
  inverse?: boolean;
};

export function Logo({ inverse = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark inverse={inverse} />
      <span
        className={`text-[19px] font-semibold tracking-[-0.02em] ${
          inverse ? "text-white" : "text-ink"
        }`}
      >
        Gleami
      </span>
    </span>
  );
}
