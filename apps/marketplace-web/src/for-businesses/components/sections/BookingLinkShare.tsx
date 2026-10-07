import React, { useState } from 'react';
import { CheckIcon, CopyIcon, LinkIcon } from 'lucide-react';
import { bookingLink } from '../../data/booking';

export function BookingLinkShare() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${bookingLink}`);
    } catch {

      // Clipboard may be unavailable in some embedded previews; still show feedback.
    }setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div>
      <h3 className="text-[17px] font-semibold tracking-tight text-ink">Share your booking link</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Add it to your website, Instagram bio or messages — clients land straight in your booking flow.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 ring-1 ring-line">
        <LinkIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{bookingLink}</span>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors duration-150 ease-out hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2">
          
          {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>);

}