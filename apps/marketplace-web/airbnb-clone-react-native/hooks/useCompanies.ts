import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";

export interface Company {
  id: string;
  name: string;
  city: string;
  street: string;
  postal_code: string;
  latitude: number;
  longitude: number;

  // Additional fields for detail page
  description?: string;
  rating?: number;
  reviewCount?: number;
  phone?: string;
  website?: string;
  services?: Array<{
    id: string;
    name: string;
    basePrice: number;
    duration: string;
    options: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  hours?: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
}

export const useCompanies = (searchTerm?: string) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's current location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Location permission not granted");
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // Pass lat and long to the edge function
        console.log("searchTerm", searchTerm);
        const { data, error } = await supabase.functions.invoke(
          "get-companies",
          {
            body: {
              lat: latitude,
              long: longitude,
              radius: 500000,
              search_term: searchTerm || "",
            },
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          setCompanies(data);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch companies"
        );
        console.error("Error fetching companies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [searchTerm]);

  return { companies, loading, error };
};
