import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useLayoutEffect, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Share,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { useTreatments } from "@/hooks/useTreatments";
import BookingBottomSheet from "@/components/BookingBottomSheet";
import { useTranslation } from "@/hooks/useTranslation";
import Animated, {
  SlideInDown,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { defaultStyles } from "@/constants/Styles";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";

const { width } = Dimensions.get("window");
const IMG_HEIGHT = 300;

// Dummy data for salon details
const getSalonData = (id: string) => {
  const salons = {
    "1": {
      id: "1",
      name: "Luxe Hair Studio",
      address: "123 Beauty Street, New York, NY 10001",
      rating: 4.8,
      reviewCount: 127,
      images: [
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop",
      ],
      description:
        "Experience luxury hair care at its finest. Our expert stylists provide personalized services using premium products and cutting-edge techniques. From classic cuts to modern styles, we create looks that make you feel confident and beautiful.",
      services: [
        {
          id: "1",
          name: "Haircut & Style",
          basePrice: 85,
          duration: "60 min",
          options: [
            { id: "short", name: "Short", price: 85 },
            { id: "medium", name: "Medium", price: 95 },
            { id: "long", name: "Long", price: 110 },
          ],
        },
        {
          id: "2",
          name: "Hair Color",
          basePrice: 120,
          duration: "90 min",
          options: [
            { id: "single", name: "Single Color", price: 120 },
            { id: "highlights", name: "Highlights", price: 150 },
            { id: "balayage", name: "Balayage", price: 180 },
          ],
        },
        {
          id: "3",
          name: "Hair Treatment",
          basePrice: 80,
          duration: "45 min",
          options: [
            { id: "keratin", name: "Keratin Treatment", price: 200 },
            { id: "deep", name: "Deep Conditioning", price: 80 },
            { id: "protein", name: "Protein Treatment", price: 100 },
          ],
        },
        {
          id: "4",
          name: "Blowout",
          basePrice: 45,
          duration: "30 min",
          options: [
            { id: "basic", name: "Basic Blowout", price: 45 },
            { id: "styling", name: "Styling Blowout", price: 60 },
          ],
        },
        {
          id: "5",
          name: "Hair Extensions",
          basePrice: 300,
          duration: "180 min",
          options: [
            { id: "clip", name: "Clip-in Extensions", price: 300 },
            { id: "tape", name: "Tape-in Extensions", price: 400 },
            { id: "sewn", name: "Sewn-in Extensions", price: 500 },
          ],
        },
        {
          id: "6",
          name: "Hair Styling",
          basePrice: 55,
          duration: "45 min",
          options: [
            { id: "updo", name: "Updo", price: 55 },
            { id: "braids", name: "Braids", price: 65 },
            { id: "curls", name: "Curls", price: 50 },
          ],
        },
      ],
      amenities: [
        { name: "Free WiFi", icon: "wifi" },
        { name: "Parking Available", icon: "car" },
        { name: "Wheelchair Accessible", icon: "accessibility" },
        { name: "Appointment Booking", icon: "calendar" },
        { name: "Product Sales", icon: "storefront" },
        { name: "Refreshments", icon: "cafe" },
      ],
      hours: {
        monday: "9:00 AM - 7:00 PM",
        tuesday: "9:00 AM - 7:00 PM",
        wednesday: "9:00 AM - 7:00 PM",
        thursday: "9:00 AM - 8:00 PM",
        friday: "9:00 AM - 8:00 PM",
        saturday: "8:00 AM - 6:00 PM",
        sunday: "10:00 AM - 5:00 PM",
      },
      phone: "(555) 123-4567",
      website: "www.luxehairstudio.com",
      owner: {
        name: "Sarah Johnson",
        avatar:
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop",
        experience: "15 years",
      },
    },
    "2": {
      id: "2",
      name: "Bella's Beauty Bar",
      address: "456 Glamour Avenue, Los Angeles, CA 90210",
      rating: 4.6,
      reviewCount: 89,
      images: [
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&h=600&fit=crop",
      ],
      description:
        "Your one-stop destination for all beauty needs. We specialize in hair, makeup, and nail services with a focus on natural beauty enhancement. Our team of certified professionals ensures you leave feeling refreshed and beautiful.",
      services: [
        {
          id: "1",
          name: "Haircut & Style",
          basePrice: 65,
          duration: "45 min",
          options: [
            { id: "short", name: "Short", price: 65 },
            { id: "medium", name: "Medium", price: 75 },
            { id: "long", name: "Long", price: 85 },
          ],
        },
        {
          id: "2",
          name: "Hair Color",
          basePrice: 95,
          duration: "75 min",
          options: [
            { id: "single", name: "Single Color", price: 95 },
            { id: "highlights", name: "Highlights", price: 120 },
            { id: "balayage", name: "Balayage", price: 140 },
          ],
        },
        {
          id: "3",
          name: "Manicure",
          basePrice: 35,
          duration: "45 min",
          options: [
            { id: "basic", name: "Basic Manicure", price: 35 },
            { id: "french", name: "French Manicure", price: 45 },
            { id: "gel", name: "Gel Manicure", price: 55 },
          ],
        },
        {
          id: "4",
          name: "Pedicure",
          basePrice: 45,
          duration: "60 min",
          options: [
            { id: "basic", name: "Basic Pedicure", price: 45 },
            { id: "deluxe", name: "Deluxe Pedicure", price: 65 },
            { id: "spa", name: "Spa Pedicure", price: 85 },
          ],
        },
        {
          id: "5",
          name: "Facial",
          basePrice: 80,
          duration: "60 min",
          options: [
            { id: "basic", name: "Basic Facial", price: 80 },
            { id: "deep", name: "Deep Cleansing", price: 100 },
            { id: "anti", name: "Anti-Aging", price: 120 },
          ],
        },
        {
          id: "6",
          name: "Makeup Application",
          basePrice: 55,
          duration: "45 min",
          options: [
            { id: "day", name: "Day Makeup", price: 55 },
            { id: "evening", name: "Evening Makeup", price: 75 },
            { id: "bridal", name: "Bridal Makeup", price: 120 },
          ],
        },
      ],
      amenities: [
        { name: "Free WiFi", icon: "wifi" },
        { name: "Valet Parking", icon: "car" },
        { name: "Wheelchair Accessible", icon: "accessibility" },
        { name: "Online Booking", icon: "calendar" },
        { name: "Retail Products", icon: "storefront" },
        { name: "Complimentary Drinks", icon: "cafe" },
      ],
      hours: {
        monday: "10:00 AM - 6:00 PM",
        tuesday: "10:00 AM - 6:00 PM",
        wednesday: "10:00 AM - 6:00 PM",
        thursday: "10:00 AM - 7:00 PM",
        friday: "10:00 AM - 7:00 PM",
        saturday: "9:00 AM - 5:00 PM",
        sunday: "Closed",
      },
      phone: "(555) 987-6543",
      website: "www.bellasbeautybar.com",
      owner: {
        name: "Bella Rodriguez",
        avatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
        experience: "12 years",
      },
    },
  };

  return salons[id as keyof typeof salons] || salons["1"];
};

interface SelectedService {
  serviceId: string;
  serviceName: string;
  optionId: string;
  optionName: string;
  price: number;
  duration: string;
}

// Transform API treatment data to match the expected service structure
const transformTreatmentsToServices = (treatments: any[]) => {
  return treatments.map((treatment) => ({
    id: treatment.id,
    name: treatment.name,
    basePrice: treatment.price_option?.[0]?.price || 0,
    duration: `${treatment.price_option?.[0]?.duration_in_minutes || 30} min`,
    options:
      treatment.price_option?.map((option: any) => ({
        id: option.id,
        name: option.name,
        price: option.price,
      })) || [],
  }));
};

const SalonDetailPage = () => {
  const { id, companyData } = useLocalSearchParams();
  const navigation = useNavigation();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // Parse company data if available, otherwise fallback to dummy data
  const company = companyData
    ? JSON.parse(companyData as string)
    : getSalonData(id as string);

  // Translation hook
  const { t } = useTranslation();

  // Fetch treatments from API
  const {
    treatments,
    loading: treatmentsLoading,
    error: treatmentsError,
  } = useTreatments(company.id);

  // Create salon object with fallback values for missing fields
  const salon = {
    ...company,
    address:
      company.address ||
      `${company.street}, ${company.city} ${company.postal_code}`,
    description:
      company.description ||
      "Professional salon services in a comfortable environment.",
    rating: company.rating || 4.5,
    reviewCount: company.reviewCount || 0,
    phone: company.phone || "(555) 123-4567",
    website: company.website || "www.salon.com",
    services:
      treatments.length > 0
        ? transformTreatmentsToServices(treatments)
        : company.services || [],
    hours: company.hours || {
      monday: "9:00 AM - 6:00 PM",
      tuesday: "9:00 AM - 6:00 PM",
      wednesday: "9:00 AM - 6:00 PM",
      thursday: "9:00 AM - 7:00 PM",
      friday: "9:00 AM - 7:00 PM",
      saturday: "8:00 AM - 5:00 PM",
      sunday: "10:00 AM - 4:00 PM",
    },
  };

  // State for selected services
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    []
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);
  const [salonImages, setSalonImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);

  // Footer expansion animation
  const footerHeight = useSharedValue(120); // Increased to account for bottom padding

  // Fetch images from Supabase storage
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingImages(true);

        // List all files in the company's illustrations folder
        const { data, error } = await supabase.storage
          .from("company")
          .list(`${company.id}/illustrations`, {
            limit: 10,
            sortBy: { column: "name", order: "asc" },
          });

        if (error) {
          console.error("Error fetching images:", error);
          // Use fallback to salon.images if error
          setSalonImages(salon.images);
          return;
        }

        if (data && data.length > 0) {
          // Get public URLs for all images
          const imageUrls = data.map((file) => {
            const { data: urlData } = supabase.storage
              .from("company")
              .getPublicUrl(`${company.id}/illustrations/${file.name}`);
            return urlData.publicUrl;
          });
          setSalonImages(imageUrls);
        } else {
          // Use fallback to salon.images if no images found
          setSalonImages(salon.images);
        }
      } catch (err) {
        console.error("Error in fetchImages:", err);
        // Use fallback to salon.images on error
        setSalonImages(salon.images);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchImages();
  }, [company.id]);

  const shareSalon = async () => {
    try {
      await Share.share({
        title: salon.name,
        message: `Check out ${salon.name} - ${salon.address}`,
      });
    } catch (err) {
      console.log(err);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerTransparent: true,
      headerBackground: () => (
        <Animated.View
          style={[headerAnimatedStyle, styles.header]}
        ></Animated.View>
      ),
      headerRight: () => (
        <View style={styles.bar}>
          <TouchableOpacity style={styles.roundButton} onPress={shareSalon}>
            <Ionicons name="share-outline" size={22} color={"#000"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundButton}>
            <Ionicons name="heart-outline" size={22} color={"#000"} />
          </TouchableOpacity>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={"#000"} />
        </TouchableOpacity>
      ),
    });
  }, []);

  const scrollOffset = useScrollViewOffset(scrollRef);

  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-IMG_HEIGHT, 0, IMG_HEIGHT, IMG_HEIGHT],
            [-IMG_HEIGHT / 2, 0, IMG_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-IMG_HEIGHT, 0, IMG_HEIGHT],
            [2, 1, 1]
          ),
        },
      ],
    };
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollOffset.value, [0, IMG_HEIGHT / 1.5], [0, 1]),
    };
  }, []);

  // Footer expansion animation
  const footerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: footerHeight.value,
    };
  });

  // Footer content animation to keep it at bottom
  const footerContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
    };
  });

  // Backdrop animation
  const backdropOpacity = useSharedValue(0);

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const toggleFooter = () => {
    if (isFooterExpanded) {
      // Collapse to normal height
      footerHeight.value = withSpring(120);
      backdropOpacity.value = withSpring(0);
      setIsFooterExpanded(false);
    } else {
      // Expand to show selected services
      footerHeight.value = withSpring(420);
      backdropOpacity.value = withSpring(0.5);
      setIsFooterExpanded(true);
    }
  };

  // Gesture handler for dragging
  const gestureHandler = (event: PanGestureHandlerGestureEvent) => {
    "worklet";
    const { translationY, velocityY } = event.nativeEvent;

    // Dragging up (negative translationY)
    if (translationY < -50 || velocityY < -500) {
      footerHeight.value = withSpring(420);
      backdropOpacity.value = withSpring(0.5);
      runOnJS(setIsFooterExpanded)(true);
    }
    // Dragging down (positive translationY)
    else if (translationY > 50 || velocityY > 500) {
      footerHeight.value = withSpring(120);
      backdropOpacity.value = withSpring(0);
      runOnJS(setIsFooterExpanded)(false);
    }
  };

  const selectServiceOption = (service: any, option: any) => {
    const selectedService: SelectedService = {
      serviceId: service.id,
      serviceName: service.name,
      optionId: option.id,
      optionName: option.name,
      price: option.price,
      duration: service.duration,
    };

    setSelectedServices((prev) => {
      const existingIndex = prev.findIndex((s) => s.serviceId === service.id);
      if (existingIndex >= 0) {
        // Replace existing selection
        const newServices = [...prev];
        newServices[existingIndex] = selectedService;
        return newServices;
      } else {
        // Add new selection
        return [...prev, selectedService];
      }
    });
  };

  const removeService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.filter((s) => s.serviceId !== serviceId)
    );
  };

  const getTotalPrice = () => {
    return selectedServices.reduce(
      (total, service) => total + service.price,
      0
    );
  };

  const handleBookNow = () => {
    if (selectedServices.length === 0) {
      // If no services selected, just open the modal
      setIsBookingModalVisible(true);
    } else {
      // Open with selected services
      setIsBookingModalVisible(true);
    }
  };

  const handleBookingComplete = (bookingData: any) => {
    console.log("Booking completed:", bookingData);
    // TODO: Send booking data to your API
    // For now, just reset the selected services
    setSelectedServices([]);
    setIsFooterExpanded(false);
  };

  const renderImageGallery = () => {
    if (loadingImages) {
      return (
        <View
          style={[styles.imageGalleryContainer, styles.imageLoadingContainer]}
        >
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    const imagesToDisplay = salonImages.length > 0 ? salonImages : salon.images;

    return (
      <View style={styles.imageGalleryContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
          }}
        >
          {imagesToDisplay.map((image: string, index: number) => (
            <Animated.Image
              key={index}
              source={{ uri: image }}
              style={[styles.galleryImage, imageAnimatedStyle]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Image indicators */}
        {imagesToDisplay.length > 1 && (
          <View style={styles.imageIndicators}>
            {imagesToDisplay.map((_: string, index: number) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}

        {/* Image counter */}
        {imagesToDisplay.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {imagesToDisplay.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderService = ({ item }: { item: any }) => {
    const isExpanded = expandedService === item.id;
    const selectedOption = selectedServices.find(
      (s) => s.serviceId === item.id
    );

    return (
      <View style={styles.serviceContainer}>
        <TouchableOpacity
          style={styles.serviceItem}
          onPress={() => setExpandedService(isExpanded ? null : item.id)}
        >
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{item.name}</Text>
            <Text style={styles.serviceDuration}>{item.duration}</Text>
            {selectedOption && (
              <Text style={styles.selectedOption}>
                Selected: {selectedOption.optionName} - ${selectedOption.price}
              </Text>
            )}
          </View>
          <View style={styles.servicePrice}>
            <Text style={styles.priceText}>From ${item.basePrice}</Text>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.primary}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.optionsContainer}>
            {item.options.map((option: any) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionItem,
                  selectedOption?.optionId === option.id &&
                    styles.selectedOptionItem,
                ]}
                onPress={() => selectServiceOption(item, option)}
              >
                <View style={styles.optionInfo}>
                  <Text style={styles.optionName}>{option.name}</Text>
                  <Text style={styles.optionDuration}>{item.duration}</Text>
                </View>
                <Text style={styles.optionPrice}>${option.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSelectedService = ({ item }: { item: SelectedService }) => (
    <View style={styles.selectedServiceItem}>
      <View style={styles.selectedServiceInfo}>
        <Text style={styles.selectedServiceName}>{item.serviceName}</Text>
        <Text style={styles.selectedServiceOption}>
          {item.optionName} • {item.duration}
        </Text>
      </View>
      <View style={styles.selectedServiceActions}>
        <Text style={styles.selectedServicePrice}>${item.price}</Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeService(item.serviceId)}
        >
          <Ionicons name="close-circle" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        ref={scrollRef}
        scrollEventThrottle={16}
      >
        {/* Image Gallery */}
        {renderImageGallery()}

        <View style={styles.infoContainer}>
          {/* Salon Header */}
          <Text style={styles.name}>{salon.name}</Text>
          <Text style={styles.address}>{salon.address}</Text>

          <View style={styles.ratingContainer}>
            <View style={styles.rating}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>{salon.rating}</Text>
              <Text style={styles.reviewCount}>
                ({salon.reviewCount} reviews)
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>{t("about")}</Text>
          <Text style={styles.description}>{salon.description}</Text>

          <View style={styles.divider} />

          {/* Services */}
          <Text style={styles.sectionTitle}>{t("servicesAndPricing")}</Text>
          {treatmentsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>{t("loading")}</Text>
            </View>
          ) : treatmentsError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#ef4444" />
              <Text style={styles.errorText}>{t("failedToLoadServices")}</Text>
              <Text style={styles.errorSubtext}>{treatmentsError}</Text>
            </View>
          ) : salon.services.length > 0 ? (
            <FlatList
              data={salon.services}
              renderItem={renderService}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cut" size={48} color={Colors.grey} />
              <Text style={styles.emptyStateText}>
                {t("noServicesAvailable")}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {t("servicesWillBeAddedSoon")}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Hours */}
          <Text style={styles.sectionTitle}>{t("hours")}</Text>
          <View style={styles.hoursContainer}>
            {Object.entries(salon.hours).map(([day, hours]) => (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.dayText}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
                <Text style={styles.hoursText}>{hours as string}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Contact Info */}
          <Text style={styles.sectionTitle}>{t("contact")}</Text>
          <View style={styles.contactContainer}>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color={Colors.primary} />
              <Text style={styles.contactText}>{salon.phone}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="globe" size={20} color={Colors.primary} />
              <Text style={styles.contactText}>{salon.website}</Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, backdropAnimatedStyle]}
        pointerEvents={isFooterExpanded ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={toggleFooter}
        />
      </Animated.View>

      {/* Expandable Footer */}
      <PanGestureHandler onHandlerStateChange={gestureHandler}>
        <Animated.View
          style={[styles.expandableFooter, footerAnimatedStyle]}
          entering={SlideInDown.delay(200)}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Selected Services List - Only visible when expanded and has services */}
          {isFooterExpanded && selectedServices.length > 0 && (
            <View style={styles.selectedServicesContainer}>
              <ScrollView
                style={styles.selectedServicesList}
                contentContainerStyle={styles.selectedServicesContent}
                showsVerticalScrollIndicator={false}
              >
                {selectedServices.map((item) => (
                  <View key={item.serviceId} style={styles.selectedServiceItem}>
                    <View style={styles.selectedServiceInfo}>
                      <Text style={styles.selectedServiceName}>
                        {item.serviceName}
                      </Text>
                      <Text style={styles.selectedServiceOption}>
                        {item.optionName} • {item.duration}
                      </Text>
                    </View>
                    <View style={styles.selectedServiceActions}>
                      <Text style={styles.selectedServicePrice}>
                        ${item.price}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeService(item.serviceId)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Footer Action Bar */}
          <Animated.View
            style={[styles.footerContent, footerContentAnimatedStyle]}
          >
            <TouchableOpacity style={styles.footerText} onPress={toggleFooter}>
              <Text style={styles.footerPrice}>
                {selectedServices.length > 0
                  ? t("servicesSelected", {
                      count: selectedServices.length,
                      plural: selectedServices.length !== 1 ? "en" : "",
                    })
                  : t("bookAppointment")}
              </Text>
              <Text style={styles.footerSubtext}>
                {selectedServices.length > 0
                  ? `${t("total")}: €${getTotalPrice()}`
                  : t("startingFrom", { price: "35" })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[defaultStyles.btn, { paddingRight: 20, paddingLeft: 20 }]}
              onPress={handleBookNow}
            >
              <Text style={defaultStyles.btnText}>
                {selectedServices.length > 0
                  ? t("bookSelected")
                  : t("bookAppointment")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>

      {/* Booking Bottom Sheet */}
      <BookingBottomSheet
        isVisible={isBookingModalVisible}
        onClose={() => setIsBookingModalVisible(false)}
        selectedServices={selectedServices}
        salonName={salon.name}
        salonAddress={salon.address}
        companyId={company.id}
        companyImages={salonImages}
        onBookingComplete={handleBookingComplete}
      />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  // Image Gallery Styles
  imageGalleryContainer: {
    position: "relative",
    height: IMG_HEIGHT,
  },
  imageLoadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  galleryImage: {
    height: IMG_HEIGHT,
    width: width,
  },
  imageIndicators: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  activeIndicator: {
    backgroundColor: "white",
  },
  imageCounter: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  imageCounterText: {
    color: "white",
    fontSize: 12,
    fontFamily: "mon-sb",
  },
  infoContainer: {
    padding: 24,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20, // Overlap slightly with image
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "mon-sb",
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: Colors.grey,
    marginBottom: 12,
    fontFamily: "mon",
  },
  ratingContainer: {
    marginBottom: 16,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  reviewCount: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.grey,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "mon-sb",
    color: Colors.dark,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "mon",
    color: Colors.dark,
  },
  // Service Selection Styles
  serviceContainer: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    overflow: "hidden",
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  serviceDuration: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 2,
  },
  selectedOption: {
    fontSize: 12,
    fontFamily: "mon",
    color: Colors.primary,
    marginTop: 4,
  },
  servicePrice: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: Colors.primary,
  },
  optionsContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedOptionItem: {
    backgroundColor: "#e3f2fd",
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 14,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  optionDuration: {
    fontSize: 12,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 14,
    fontFamily: "mon-sb",
    color: Colors.primary,
  },
  hoursContainer: {
    gap: 8,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayText: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  hoursText: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
  },
  contactContainer: {
    gap: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    fontFamily: "mon",
    color: Colors.dark,
  },
  footerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34, // Extra padding for home indicator
    gap: 16,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  footerText: {
    flex: 1,
  },
  footerPrice: {
    fontSize: 18,
    fontFamily: "mon-sb",
    color: Colors.dark,
  },
  footerSubtext: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 50,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    color: Colors.primary,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  header: {
    backgroundColor: "#fff",
    height: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.grey,
  },
  // Backdrop Styles
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: 1,
  },
  backdropTouchable: {
    width: "100%",
    height: "100%",
  },
  // Expandable Footer Styles
  expandableFooter: {
    zIndex: 2,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 15,
    overflow: "visible",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.grey,
    borderRadius: 2,
    opacity: 0.3,
  },
  selectedServicesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120, // Account for footer content height
  },
  selectedServicesList: {
    flex: 1,
  },
  selectedServicesContent: {
    paddingBottom: 20,
  },
  selectedServiceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 10,
  },
  selectedServiceInfo: {
    flex: 1,
    marginRight: 12,
  },
  selectedServiceName: {
    fontSize: 15,
    fontFamily: "mon-sb",
    color: Colors.dark,
    marginBottom: 4,
  },
  selectedServiceOption: {
    fontSize: 13,
    fontFamily: "mon",
    color: Colors.grey,
  },
  selectedServiceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedServicePrice: {
    fontSize: 14,
    fontFamily: "mon-sb",
    color: Colors.primary,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: Colors.grey,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 4,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "mon-sb",
    color: "#ef4444",
    marginTop: 12,
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: "mon",
    color: Colors.grey,
    marginTop: 4,
    textAlign: "center",
  },
});

export default SalonDetailPage;
