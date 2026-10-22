"use client";

import { useEffect, useState } from "react";
import { HeartIcon, ShareIcon } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { rememberLike } from "@/components/auth/pending-like";
import { isLiked, setLike } from "@/lib/marketplace-browser";

type SalonActionsProps = {
  locationId: string;
  name: string;
  shareLabel: string;
  saveLabel: string;
  savedLabel: string;
  copiedLabel: string;
};

export function SalonActions({
  locationId,
  name,
  shareLabel,
  saveLabel,
  savedLabel,
  copiedLabel,
}: SalonActionsProps) {
  const { user, openAuth } = useAuth();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(false);
      return;
    }
    let active = true;
    void isLiked(user.id, locationId)
      .then((liked) => {
        if (active) setSaved(liked);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, locationId]);

  useEffect(() => {
    const refresh = () => {
      if (!user) return;
      void isLiked(user.id, locationId)
        .then(setSaved)
        .catch(() => undefined);
    };
    window.addEventListener("gleami-likes", refresh);
    return () => window.removeEventListener("gleami-likes", refresh);
  }, [user, locationId]);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const toggle = () => {
    if (!user) {
      rememberLike(locationId);
      openAuth({ purpose: "save" });
      return;
    }
    const next = !saved;
    setSaved(next);
    void setLike(user.id, locationId, next).catch(() => setSaved(!next));
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={share}
        aria-label={copied ? copiedLabel : shareLabel}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink ring-1 ring-line transition hover:bg-canvas"
      >
        <ShareIcon aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? savedLabel : saveLabel}
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-line transition hover:bg-canvas ${
          saved ? "text-red-600" : "text-ink"
        }`}
      >
        <HeartIcon
          aria-hidden="true"
          className={`h-[18px] w-[18px] ${saved ? "fill-current" : ""}`}
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </div>
  );
}
