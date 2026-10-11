export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span
      className={`inline-flex items-baseline text-[26px] font-bold tracking-[-0.04em] ${
        inverted ? "text-white" : "text-navy"
      }`}
    >
      gleami
      <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-peri-light" aria-hidden="true" />
    </span>
  );
}
