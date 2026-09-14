import { useState, useEffect } from "react";

interface PriceOption {
  id: string;
  name: string;
  price: number;
  max_price?: number;
  duration_in_minutes: number;
  image_path?: string;
  order: number;
}

interface Treatment {
  id: string;
  name: string;
  description: string;
  company_id: string;
  order: number;
  price_option: PriceOption[];
}

interface UseTreatmentsResult {
  treatments: Treatment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTreatments = (companyId: string): UseTreatmentsResult => {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTreatments = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-treatments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            company_id: companyId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTreatments(data);
    } catch (err) {
      console.error("Error fetching treatments:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch treatments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, [companyId]);

  return {
    treatments,
    loading,
    error,
    refetch: fetchTreatments,
  };
};
