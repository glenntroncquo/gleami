import {
  View,
  Text,
  StyleSheet,
  ListRenderItem,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { defaultStyles } from "@/constants/Styles";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import {
  BottomSheetFlatList,
  BottomSheetFlatListMethods,
} from "@gorhom/bottom-sheet";
import type { Company } from "@/hooks/useCompanies";
import ListingSkeleton from "./ListingSkeleton";
import { supabase } from "@/lib/supabase";

const { width } = Dimensions.get("window");

interface Props {
  listings: Company[];
  refresh: number;
  category: string;
  animationDirection: "left" | "right";
}

interface ListingItemProps {
  item: Company;
  animationDirection: "left" | "right";
}

// Separate component for each listing item to properly use hooks
const ListingItem = ({ item, animationDirection }: ListingItemProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  // Fetch images from Supabase storage
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingImages(true);

        // List all files in the company's illustrations folder
        const { data, error } = await supabase.storage
          .from("company")
          .list(`${item.id}/illustrations`, {
            limit: 10,
            sortBy: { column: "name", order: "asc" },
          });

        if (error) {
          console.error("Error fetching images:", error);
          // Use fallback image if error
          setImages([
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
          ]);
          return;
        }

        if (data && data.length > 0) {
          // Get public URLs for all images
          const imageUrls = data.map((file) => {
            const { data: urlData } = supabase.storage
              .from("company")
              .getPublicUrl(`${item.id}/illustrations/${file.name}`);
            return urlData.publicUrl;
          });
          setImages(imageUrls);
        } else {
          // Use fallback image if no images found
          setImages([
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
          ]);
        }
      } catch (err) {
        console.error("Error in fetchImages:", err);
        // Use fallback image on error
        setImages([
          "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop",
        ]);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchImages();
  }, [item.id]);

  return (
    <View style={styles.listing}>
      {/* Image Gallery - Standalone, no navigation wrapping */}
      <Link
        href={{
          pathname: `/salon/${item.id}`,
          params: { companyData: JSON.stringify(item) },
        }}
        asChild
      >
        <TouchableOpacity activeOpacity={1}>
          <View
            style={styles.imageGalleryContainer}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
            {loadingImages || images.length === 0 ? (
              // Show placeholder while loading
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="image-outline" size={48} color="#ccc" />
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const contentOffsetX = event.nativeEvent.contentOffset.x;
                    const imageWidth = width - 32; // Account for padding
                    const index = Math.round(contentOffsetX / imageWidth);
                    setCurrentImageIndex(index);
                  }}
                  style={styles.imageScrollView}
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                  bounces={false}
                  disableIntervalMomentum
                >
                  {images.map((imageUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                {/* Image Indicators - Only show if more than 1 image */}
                {images.length > 1 && (
                  <View style={styles.imageIndicators} pointerEvents="none">
                    {images.map((_, index) => (
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

                {/* Image Counter - Only show if more than 1 image */}
                {images.length > 1 && (
                  <View style={styles.imageCounter} pointerEvents="none">
                    <Text style={styles.imageCounterText}>
                      {currentImageIndex + 1} / {images.length}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Heart Icon */}
            <TouchableOpacity style={styles.heartButton}>
              <Ionicons name="heart-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Link>

      {/* Text/Info section - Wrapped with navigation */}
      <Link
        href={{
          pathname: `/salon/${item.id}`,
          params: { companyData: JSON.stringify(item) },
        }}
        asChild
      >
        <TouchableOpacity activeOpacity={0.7}>
          <View style={styles.infoSection}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 16, fontFamily: "mon-sb" }}>
                {item.name}
              </Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Ionicons name="star" size={16} />
                <Text style={{ fontFamily: "mon-sb" }}>4.8</Text>
              </View>
            </View>
            <Text style={{ fontFamily: "mon" }}>{item.city}</Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Text style={{ fontFamily: "mon" }}>
                {item.street}, {item.postal_code}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

const Listings = ({
  listings: items,
  refresh,
  category,
  animationDirection,
}: Props) => {
  const listRef = useRef<BottomSheetFlatListMethods>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Update the view to scroll the list back top
  useEffect(() => {
    if (refresh) {
      scrollListTop();
    }
  }, [refresh]);

  const scrollListTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Use for "updating" the views data after category changed
  useEffect(() => {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [category]);

  // Render one listing row for the FlatList
  const renderRow: ListRenderItem<Company> = ({ item }) => {
    return <ListingItem item={item} animationDirection={animationDirection} />;
  };

  // Render skeleton loaders during category change
  const renderSkeleton = () => {
    return (
      <View style={{ marginTop: 30 }}>
        <ListingSkeleton />
        <ListingSkeleton />
        <ListingSkeleton />
      </View>
    );
  };

  return (
    <View style={defaultStyles.container}>
      {loading ? (
        <Animated.View
          key="skeleton"
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          {renderSkeleton()}
        </Animated.View>
      ) : (
        <Animated.View
          key="content"
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
        >
          <BottomSheetFlatList
            renderItem={renderRow}
            data={items}
            ref={listRef}
            ListHeaderComponent={
              <View style={styles.headerContainer}>
                <Text style={styles.info}>{items.length} salons</Text>
              </View>
            }
            
            BottomSheetFooter={() => <View style={{ height: 2000 }}></View>}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  listing: {
    padding: 16,
    gap: 10,
    marginVertical: 16,
  },
  imageGalleryContainer: {
    position: "relative",
    height: 300,
    borderRadius: 20,
    overflow: "hidden",
  },
  infoSection: {
    gap: 10,
  },
  imageScrollView: {
    width: "100%",
  },
  image: {
    width: width - 32, // Account for padding
    height: 300,
    borderRadius: 20,
  },
  imagePlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  imageIndicators: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeIndicator: {
    backgroundColor: "white",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  imageCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: "white",
    fontSize: 12,
    fontFamily: "mon-sb",
  },
  heartButton: {
    position: "absolute",
    right: 12,
    top: 52,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  headerContainer: {
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#fff",
  },
  info: {
    textAlign: "center",
    fontFamily: "mon-sb",
    fontSize: 16,
    marginTop: 0,
    marginBottom: 10,
  },
});

export default Listings;
