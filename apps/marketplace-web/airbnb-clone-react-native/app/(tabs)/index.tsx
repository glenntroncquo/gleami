import { View, ActivityIndicator, Text } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import ListingsBottomSheet from "@/components/ListingsBottomSheet";
import ListingsMap from "@/components/ListingsMap";
import { Stack, useLocalSearchParams } from "expo-router";
import ExploreHeader from "@/components/ExploreHeader";
import { useCompanies } from "@/hooks/useCompanies";

const Page = () => {
  const params = useLocalSearchParams<{ searchTerm?: string }>();
  const { companies, loading, error } = useCompanies(params.searchTerm);
  const [category, setCategory] = useState<string>("All Salons");
  const [animationDirection, setAnimationDirection] = useState<
    "left" | "right"
  >("right");

  useEffect(() => {
    console.log("params", params);
  }, [params]);

  // Convert companies to map data format
  const mapItems = useMemo(() => {
    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      latitude: company.latitude,
      longitude: company.longitude,
    }));
  }, [companies]);

  const onDataChanged = (category: string, direction: "left" | "right") => {
    setCategory(category);
    // Store direction for the Listings component to use
    setAnimationDirection(direction);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          marginTop: 80,
        }}
      >
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 10, fontFamily: "mon" }}>
          Loading salons...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          marginTop: 80,
        }}
      >
        <Text style={{ fontFamily: "mon-sb", color: "red" }}>
          Error: {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, marginTop: 80 }}>
      {/* Define pour custom header */}
      <Stack.Screen
        options={{
          header: () => <ExploreHeader onCategoryChanged={onDataChanged} />,
        }}
      />
      {!loading && mapItems.length > 0 ? (
        <ListingsMap listings={mapItems} companies={companies} />
      ) : !loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f5f5f5",
          }}
        >
          <Text style={{ fontFamily: "mon-sb", fontSize: 16, color: "#666" }}>
            No salons found
          </Text>
        </View>
      ) : null}
      <ListingsBottomSheet
        listings={companies}
        category={category}
        animationDirection={animationDirection}
      />
    </View>
  );
};

export default Page;
