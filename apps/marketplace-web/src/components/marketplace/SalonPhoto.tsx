"use client";

import { useState } from "react";
import Image from "next/image";
import { SparklesIcon } from "lucide-react";
import styles from "./SalonExplorer.module.css";

export function SalonPhoto({
  src,
  name,
  caption,
  sizes = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 30vw",
  eager = false,
}: {
  src: string | null;
  name: string;
  caption?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // The social sharing graphic is not a salon photo.
  const image = src && src !== "/og/home.jpg" && !failed ? src : null;

  return (
    <div className={styles.photo} data-loaded={loaded || !image}>
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className={styles.photoImage}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={styles.photoFallback} aria-hidden="true">
          <span className={styles.fallbackOrbit} />
          <SparklesIcon className={styles.fallbackSpark} strokeWidth={1.25} />
          <span className={styles.fallbackName}>{name}</span>
          {caption ? <span className={styles.fallbackCaption}>{caption}</span> : null}
        </div>
      )}
    </div>
  );
}
