"use client";

import { ArrowRightIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/ButtonLink";

const DEMO_URL =
  "https://calendly.com/glenntroncquo1/30min?primary_color=5b7cf0";
const WIDGET_SRC = "https://assets.calendly.com/assets/external/widget.js";
const WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";

type CalendlyApi = {
  initPopupWidget: (options: { url: string }) => void;
};

declare global {
  interface Window {
    Calendly?: CalendlyApi;
  }
}

let widgetReady: Promise<void> | null = null;

function ensureCalendly() {
  if (window.Calendly) return Promise.resolve();
  if (widgetReady) return widgetReady;

  widgetReady = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${WIDGET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = WIDGET_CSS;
      document.head.appendChild(link);
    }

    const finish = () => {
      if (window.Calendly) resolve();
      else reject(new Error("Calendly widget did not initialize"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Calendly widget failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGET_SRC;
    script.async = true;
    script.onload = finish;
    script.onerror = () => {
      widgetReady = null;
      reject(new Error("Calendly widget failed to load"));
    };
    document.body.appendChild(script);
  });

  return widgetReady;
}

type BookDemoButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
};

export function BookDemoButton({
  children,
  className = "",
  variant,
  size = "md",
  arrow = false,
}: BookDemoButtonProps) {
  const opening = useRef(false);

  async function openDemo() {
    if (opening.current) return;
    opening.current = true;
    try {
      await ensureCalendly();
      window.Calendly?.initPopupWidget({ url: DEMO_URL });
    } catch {
      window.open(DEMO_URL, "_blank", "noopener,noreferrer");
    } finally {
      opening.current = false;
    }
  }

  return (
    <button
      type="button"
      onClick={openDemo}
      aria-haspopup="dialog"
      className={variant ? buttonClassName(variant, size, className) : className}
    >
      {children}
      {arrow ? (
        <ArrowRightIcon
          aria-hidden="true"
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
        />
      ) : null}
    </button>
  );
}
