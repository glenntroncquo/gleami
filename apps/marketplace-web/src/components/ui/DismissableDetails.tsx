"use client";

import { useEffect, useRef, type DetailsHTMLAttributes } from "react";

export function DismissableDetails(props: DetailsHTMLAttributes<HTMLDetailsElement>) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    function closeIfOutside(event: PointerEvent) {
      if (!root?.open) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      root.open = false;
    }

    document.addEventListener("pointerdown", closeIfOutside);
    return () => document.removeEventListener("pointerdown", closeIfOutside);
  }, []);

  return <details ref={ref} {...props} />;
}
