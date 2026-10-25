"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { rememberLike } from "@/components/auth/pending-like";
import { listFavorites, setLike } from "@/lib/marketplace-browser";

const empty = new Set<string>();

export function useSalonFavorites() {
  const { user, loading, openAuth } = useAuth();
  const [saved, setSaved] = useState({ userId: "", ids: empty });
  const [pendingIds, setPendingIds] = useState<Set<string>>(empty);
  const busy = useRef(new Set<string>());
  const [error, setError] = useState(false);
  const ids = user?.id === saved.userId ? saved.ids : empty;
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const refresh = () => {
      void listFavorites(userId).then((rows) => {
        if (!cancelled) setSaved({ userId, ids: new Set(rows.map((row) => row.locationId)) });
      }).catch(() => undefined);
    };
    refresh();
    window.addEventListener("gleami-likes", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("gleami-likes", refresh);
    };
  }, [userId]);

  async function toggle(id: string) {
    if (loading || busy.current.has(id)) return;
    if (!userId) {
      rememberLike(id);
      openAuth({ purpose: "save" });
      return;
    }
    setError(false);
    busy.current.add(id);
    setPendingIds(new Set(busy.current));
    const liked = !ids.has(id);
    const update = (value: boolean) => setSaved((previous) => {
      const next = new Set(previous.userId === userId ? previous.ids : []);
      if (value) next.add(id);
      else next.delete(id);
      return { userId, ids: next };
    });
    update(liked);
    try {
      await setLike(userId, id, liked);
      window.dispatchEvent(new Event("gleami-likes"));
    } catch {
      update(!liked);
      setError(true);
    } finally {
      busy.current.delete(id);
      setPendingIds(new Set(busy.current));
    }
  }

  return { ids, pendingIds, loading, error, toggle };
}
