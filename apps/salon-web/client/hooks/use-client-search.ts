"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ClientSearchResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  rank?: number;
};

export function useClientSearch(options?: { debounceMs?: number; companyId?: string | null }) {
  const debounceMs = options?.debounceMs ?? 350;
  const companyId = options?.companyId;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchClients = useCallback(async (term: string) => {
    if (term.trim().length < 2 || !companyId) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("client-search", {
        body: { search_term: term, company_id: companyId },
      });

      if (error) {
        console.error("Error searching clients:", error);
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setResults((data as ClientSearchResult[]) || []);
      setShowDropdown(true);
    } catch (err) {
      console.error("Error searching clients:", err);
      setResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, [companyId]);

  const handleChange = useCallback(
    (value: string) => {
      setSearchTerm(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void searchClients(value);
      }, debounceMs);
    },
    [debounceMs, searchClients]
  );

  const clear = useCallback(() => {
    setSearchTerm("");
    setResults([]);
    setIsSearching(false);
    setShowDropdown(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    results,
    setResults,
    isSearching,
    showDropdown,
    setShowDropdown,
    handleChange,
    searchClients,
    clear,
  };
}

