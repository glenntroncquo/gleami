import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
} from "react-native";
import React, { memo, useEffect, useRef, useCallback, useState } from "react";
import { defaultStyles } from "@/constants/Styles";
import { Marker } from "react-native-maps";
import MapView from "react-native-map-clustering";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import * as Location from "expo-location";
import SalonInfoCard from "./SalonInfoCard";
import { Company } from "@/hooks/useCompanies";

interface Props {
  listings: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }>;
  companies: Company[];
}

const INITIAL_REGION = {
  latitude: 37.33,
  longitude: -122,
  latitudeDelta: 9,
  longitudeDelta: 9,
};

const renderCluster = (cluster: any) => {
  const { id, geometry, onPress, properties } = cluster;
  const points = properties.point_count;

  return (
    <Marker
      key={`cluster-${id}`}
      coordinate={{
        longitude: geometry.coordinates[0],
        latitude: geometry.coordinates[1],
      }}
      onPress={onPress}
    >
      <View style={styles.marker}>
        <Text style={styles.clusterText}>{points}</Text>
      </View>
    </Marker>
  );
};

const ListingsMap = memo(({ listings, companies }: Props) => {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [selectedSalon, setSelectedSalon] = useState<Company | null>(null);
  const [cardVisible, setCardVisible] = useState(false);
  const cardAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onLocateMe();
  }, []);

  const onMarkerSelected = useCallback(
    (item: any) => {
      const salon = companies.find((company) => company.id === item.id);
      if (salon) {
        // If clicking the same salon, toggle the card
        if (selectedSalon?.id === salon.id) {
          if (cardVisible) {
            onCloseCard();
          } else {
            setCardVisible(true);
            Animated.spring(cardAnimation, {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }).start();
          }
        } else {
          // If clicking a different salon, close current and open new one
          if (cardVisible) {
            Animated.timing(cardAnimation, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              setSelectedSalon(salon);
              setCardVisible(true);
              Animated.spring(cardAnimation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }).start();
            });
          } else {
            // No card is open, just open the new one
            setSelectedSalon(salon);
            setCardVisible(true);
            Animated.spring(cardAnimation, {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }).start();
          }
        }
      }
    },
    [companies, cardAnimation, selectedSalon, cardVisible, onCloseCard]
  );

  const onCloseCard = useCallback(() => {
    Animated.timing(cardAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCardVisible(false);
      setSelectedSalon(null);
    });
  }, [cardAnimation]);

  const onBookSalon = useCallback(
    (salon: Company) => {
      // Navigate to booking page or show booking modal
      router.push(`/listing/${salon.id}`);
    },
    [router]
  );

  const onLocateMe = useCallback(async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    let location = await Location.getCurrentPositionAsync({});

    const region = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 7,
      longitudeDelta: 7,
    };

    mapRef.current?.animateToRegion(region);
  }, []);

  const onRegionChangeComplete = useCallback(() => {
    // Keep empty or add logic here if needed
  }, []);

  return (
    <View style={defaultStyles.container}>
      <MapView
        mapRef={(map) => {
          mapRef.current = map;
        }}
        animationEnabled={false}
        style={StyleSheet.absoluteFillObject}
        provider="google"
        initialRegion={INITIAL_REGION}
        clusterColor="#fff"
        clusterTextColor="#000"
        clusterFontFamily="mon-sb"
        renderCluster={renderCluster}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {listings && listings.length > 0
          ? listings.map((item) => (
              <Marker
                coordinate={{
                  latitude: item.latitude,
                  longitude: item.longitude,
                }}
                key={item.id}
                onPress={() => onMarkerSelected(item)}
              >
                <View style={styles.marker}>
                  <Text style={styles.markerText}>{item.name}</Text>
                </View>
              </Marker>
            ))
          : null}
      </MapView>
      <TouchableOpacity style={styles.locateBtn} onPress={onLocateMe}>
        <Ionicons name="navigate" size={24} color={Colors.dark} />
      </TouchableOpacity>

      {/* Salon Info Card */}
      <SalonInfoCard
        salon={selectedSalon}
        visible={cardVisible}
        onClose={onCloseCard}
        onBook={onBookSalon}
        animationValue={cardAnimation}
      />
    </View>
  );
});

ListingsMap.displayName = "ListingsMap";

const styles = StyleSheet.create({
  marker: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    elevation: 5,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {
      width: 1,
      height: 10,
    },
  },
  markerText: {
    fontSize: 14,
    fontFamily: "mon-sb",
    color: "#000",
  },
  clusterText: {
    color: "#000",
    textAlign: "center",
    fontFamily: "mon-sb",
    fontSize: 14,
  },
  locateBtn: {
    position: "absolute",
    top: 70,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {
      width: 1,
      height: 10,
    },
  },
});

export default ListingsMap;
