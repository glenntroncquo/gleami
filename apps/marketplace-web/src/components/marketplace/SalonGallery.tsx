"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";

type SalonGalleryProps = {
  images: string[];
  name: string;
  city: string;
  photosLabel: string;
  seeAllLabel: string;
  galleryLabel: string;
  closeLabel: string;
};

export function SalonGallery({
  images,
  name,
  city,
  photosLabel,
  seeAllLabel,
  galleryLabel,
  closeLabel,
}: SalonGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const available = images.filter((image) => !failed.includes(image));
  const preview = available.slice(0, 3);
  const seeAllIndex = preview.length - 1;

  const hideImage = (image: string) => {
    if (!image) return;
    setFailed((current) => (current.includes(image) ? current : [...current, image]));
  };

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(available.length - 1, 0)));
  }, [available.length]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (available.length < 2) return;
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % available.length);
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + available.length) % available.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, available.length]);

  const openAt = (next: number) => {
    setIndex(next);
    setOpen(true);
  };

  return (
    <>
      <section
        aria-label={photosLabel}
        className={`mt-6 grid gap-2 md:gap-3 ${
          preview.length === 1
            ? ""
            : "grid-cols-2 md:h-[460px] md:grid-cols-[minmax(0,1.72fr)_minmax(220px,0.86fr)] md:grid-rows-2"
        }`}
      >
        {preview.length === 0 ? (
          <div className="h-[320px] rounded-[20px] bg-shell md:h-[460px]" />
        ) : null}
        {preview.map((image, imageIndex) => {
          const single = preview.length === 1;
          const primary = imageIndex === 0;
          const span = single
            ? "h-[320px] md:h-[460px]"
            : primary
              ? "col-span-2 h-[280px] md:col-span-1 md:row-span-2 md:h-full"
              : preview.length === 2
                ? "col-span-2 h-[180px] md:col-span-1 md:row-span-2 md:h-full"
                : "h-[132px] md:h-full";
          return (
            <div key={`${image}-${imageIndex}`} className={`relative ${span}`}>
              <button
                type="button"
                onClick={() => openAt(imageIndex)}
                className="absolute inset-0 overflow-hidden rounded-[20px] bg-shell focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peri"
              >
                <Image
                  src={image}
                  alt={
                    imageIndex === 0
                      ? `${name}, ${city}`
                      : `${photosLabel} ${imageIndex + 1} · ${name}`
                  }
                  fill
                  priority={imageIndex === 0}
                  sizes={
                    imageIndex === 0
                      ? "(max-width: 768px) 100vw, 62vw"
                      : "(max-width: 768px) 50vw, 28vw"
                  }
                  className="object-cover transition duration-500 hover:scale-[1.03]"
                  onLoad={(event) => {
                    const photo = event.currentTarget;
                    if (photo.naturalWidth < 80 || photo.naturalHeight < 80) {
                      hideImage(image);
                    }
                  }}
                  onError={() => hideImage(image)}
                />
              </button>
              {imageIndex === seeAllIndex && available.length > 1 ? (
                <button
                  type="button"
                  onClick={() => openAt(0)}
                  className="absolute bottom-3 right-3 z-10 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-soft ring-1 ring-black/5 transition hover:bg-canvas"
                >
                  {seeAllLabel}
                </button>
              ) : null}
            </div>
          );
        })}
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-label={galleryLabel}
        >
          <div className="mx-auto flex w-full max-w-6xl items-start justify-between px-5 py-6 md:px-8">
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight text-ink md:text-[32px]">
                {galleryLabel}
              </h2>
              <p className="mt-1 text-[14px] text-muted">{name}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-line transition hover:bg-canvas"
            >
              <XIcon aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto px-5 pb-8 md:px-8">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[20px] bg-shell">
              <Image
                src={available[index] ?? available[0]}
                alt={`${photosLabel} ${index + 1} · ${name}`}
                fill
                sizes="(max-width: 1152px) 100vw, 1152px"
                className="object-cover"
                onError={() => hideImage(available[index] ?? "")}
              />
              {available.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setIndex((current) => (current - 1 + available.length) % available.length)
                    }
                    aria-label="Previous"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-black/5"
                  >
                    <ChevronLeftIcon aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndex((current) => (current + 1) % available.length)}
                    aria-label="Next"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-black/5"
                  >
                    <ChevronRightIcon aria-hidden="true" className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
            {available.length > 1 ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {available.map((image, imageIndex) => {
                  const selected = imageIndex === index;
                  return (
                    <button
                      key={`${image}-thumb-${imageIndex}`}
                      type="button"
                      onClick={() => setIndex(imageIndex)}
                      aria-label={`${photosLabel} ${imageIndex + 1}`}
                      aria-current={selected ? "true" : undefined}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 ${
                        selected ? "ring-ink" : "ring-transparent"
                      }`}
                    >
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
