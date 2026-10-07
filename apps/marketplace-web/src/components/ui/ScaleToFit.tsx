"use client";

import React, { useLayoutEffect, useRef, useState } from 'react';

type ScaleToFitProps = {
  width: number;
  children: React.ReactNode;
  className?: string;
};

/**
 * Renders a fixed-width design and scales it down proportionally to fit
 * its container, so product mockups keep pixel-perfect fidelity on small screens.
 */
export function ScaleToFit({ width, children, className = '' }: ScaleToFitProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const next = Math.min(1, outer.clientWidth / width);
      setScale(next);
      setHeight(inner.offsetHeight * next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outerRef} className={`relative w-full ${className}`} style={{ height }}>
      <div
        ref={innerRef}
        style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        className="absolute left-0 top-0">
        
        {children}
      </div>
    </div>);

}