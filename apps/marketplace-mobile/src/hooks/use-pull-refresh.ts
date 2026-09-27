import { useRef, useState } from 'react';

/** Background cache updates must never activate the native refresh control. */
export function usePullRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const active = useRef(false);
  const onRefresh = async () => {
    if (active.current) return;
    active.current = true;
    setRefreshing(true);
    try { await refetch(); } finally {
      active.current = false;
      setRefreshing(false);
    }
  };
  return { refreshing, onRefresh };
}
