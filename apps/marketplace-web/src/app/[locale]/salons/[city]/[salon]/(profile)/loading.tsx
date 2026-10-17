export default function SalonLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-8 md:px-8 md:pt-10" aria-busy="true">
      <span className="sr-only">Loading salon</span>
      <div className="h-4 w-64 rounded-full bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div
        className="mt-6 grid h-[320px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-[28px] md:h-[520px]"
        aria-hidden="true"
      >
        <div className="col-span-4 row-span-2 rounded-[20px] bg-navy/10 motion-safe:animate-pulse md:col-span-2" />
        <div className="hidden rounded-[20px] bg-navy/10 motion-safe:animate-pulse md:block" />
        <div className="hidden rounded-[20px] bg-navy/10 motion-safe:animate-pulse md:block" />
        <div className="hidden rounded-[20px] bg-navy/10 motion-safe:animate-pulse md:block" />
        <div className="hidden rounded-[20px] bg-navy/10 motion-safe:animate-pulse md:block" />
      </div>
      <div className="mt-8 h-10 w-72 max-w-full rounded-full bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div className="mt-4 h-4 w-48 rounded-full bg-navy/10 motion-safe:animate-pulse" aria-hidden="true" />
      <div className="mt-10 space-y-3" aria-hidden="true">
        <div className="h-4 w-full rounded-full bg-navy/10 motion-safe:animate-pulse" />
        <div className="h-4 w-11/12 rounded-full bg-navy/10 motion-safe:animate-pulse" />
        <div className="h-4 w-2/3 rounded-full bg-navy/10 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
