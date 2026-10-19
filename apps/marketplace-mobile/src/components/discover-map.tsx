import React from 'react';

import type { SearchItem } from '@/src/api/types';
import { MapPlaceholder } from '@/src/components/map-placeholder';

type DiscoverMapProps = {
  items: SearchItem[];
  selectedSlug: string | null;
  onSelect: (slug: string | null) => void;
};

/** Web (and any platform without the native map module) keeps the list usable. */
export function DiscoverMap({ items, selectedSlug, onSelect }: DiscoverMapProps) {
  return <MapPlaceholder items={items} reason="web" selectedSlug={selectedSlug} onSelect={onSelect} />;
}
