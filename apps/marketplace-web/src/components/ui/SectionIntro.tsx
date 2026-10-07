import type { ReactNode } from "react";

type SectionIntroProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  inverse?: boolean;
  align?: "center" | "left" | "split";
  children?: ReactNode;
};

export function SectionIntro({
  id,
  eyebrow,
  title,
  description,
  inverse = false,
  align = "center",
  children,
}: SectionIntroProps) {
  if (align === "split") {
    return (
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
        <div className="lg:col-span-7">
          {eyebrow ? (
            <p
              className={`text-[15px] font-medium ${
                inverse ? "text-rose-300" : "text-rose-600"
              }`}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            id={id}
            className={`text-balance ${
              eyebrow ? "mt-3" : ""
            } text-[38px] font-semibold leading-[1.04] tracking-tightest md:text-[52px] lg:text-[64px] ${
              inverse ? "text-white" : "text-ink"
            }`}
          >
            {title}
          </h2>
        </div>
        <div className="lg:col-span-5 lg:pb-2">
          {description ? (
            <p
              className={`text-pretty text-[18px] leading-relaxed md:text-[20px] ${
                inverse ? "text-white/70" : "text-muted"
              }`}
            >
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-3xl text-center"
          : "max-w-2xl"
      }
    >
      {eyebrow ? (
        <p
          className={`text-[15px] font-medium ${
            inverse ? "text-rose-300" : "text-rose-600"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className={`text-balance ${
          eyebrow ? "mt-3" : ""
        } text-[38px] font-semibold leading-[1.04] tracking-tightest md:text-[52px] lg:text-[64px] ${
          inverse ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-5 text-pretty text-[18px] leading-relaxed md:text-[20px] ${
            inverse ? "text-white/70" : "text-muted"
          }`}
        >
          {description}
        </p>
      ) : null}
      {children ? (
        <div
          className={`mt-8 flex flex-wrap gap-3 ${
            align === "center" ? "justify-center" : ""
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
