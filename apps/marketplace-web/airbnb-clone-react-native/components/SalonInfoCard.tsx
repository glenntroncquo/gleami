import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { Company } from "@/hooks/useCompanies";

interface Props {
  salon: Company | null;
  visible: boolean;
  onClose: () => void;
  onBook: (salon: Company) => void;
  animationValue?: Animated.Value;
}

const { width } = Dimensions.get("window");

const SalonInfoCard = ({
  salon,
  visible,
  onClose,
  onBook,
  animationValue,
}: Props) => {
  if (!salon) return null;

  const translateY =
    animationValue?.interpolate({
      inputRange: [0, 1],
      outputRange: [50, 0],
    }) || (visible ? 0 : 50);

  const opacity =
    animationValue?.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }) || (visible ? 1 : 0);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.salonName}>{salon.name}</Text>
            <Text style={styles.salonAddress}>
              {salon.street}, {salon.city} {salon.postal_code}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.dark} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.infoRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.infoText}>
              {salon.street}, {salon.city} {salon.postal_code}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => onBook(salon)}
            >
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={styles.bookButtonText}>Book</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.directionsButton}>
              <Ionicons
                name="navigate-outline"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.directionsButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    zIndex: 1000,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    minHeight: 180,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    marginRight: 10,
  },
  salonName: {
    fontSize: 20,
    fontFamily: "mon-sb",
    color: Colors.dark,
    marginBottom: 4,
  },
  salonAddress: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
    lineHeight: 20,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  content: {
    gap: 12,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.dark,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    justifyContent: "space-between",
  },
  bookButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    marginRight: 4,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "mon-sb",
  },
  directionsButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    marginLeft: 4,
  },
  directionsButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: "mon-sb",
  },
});

export default SalonInfoCard;
