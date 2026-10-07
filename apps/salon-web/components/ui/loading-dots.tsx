type LoadingDotsProps = {
  label: string;
  className?: string;
};

export function LoadingDots({ label, className = "" }: LoadingDotsProps) {
  return (
    <span role="status" aria-label={label} className={`inline-flex items-center justify-center gap-1.5 ${className}`}>
      {[0, 1, 2, 3].map((dot) => (
        <span
          key={dot}
          aria-hidden="true"
          className="gleami-loading-dot h-2 w-2 rounded-full bg-current"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </span>
  );
}
