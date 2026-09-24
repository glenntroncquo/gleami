import React from 'react';

import type { SearchItem } from '@/src/api/types';
import { MapPlaceholder } from '@/src/components/map-placeholder';

/** Web (and any platform without the native map module) keeps the list usable. */
export function DiscoverMap({ items }: { items: SearchItem[] }) {
  return <MapPlaceholder items={items} reason="web" />;
}
