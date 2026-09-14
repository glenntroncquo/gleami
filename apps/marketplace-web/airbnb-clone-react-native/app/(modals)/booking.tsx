import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { TextInput } from "react-native-gesture-handler";
import { defaultStyles } from "@/constants/Styles";
import Colors from "@/constants/Colors";
import { useRouter } from "expo-router";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const salonCategories = [
  {
    name: "Alle Salons",
    emoji: "🏪",
  },
  {
    name: "Kappers",
    emoji: "💇‍♀️",
  },
  {
    name: "Keratine",
    emoji: "✨",
  },
  {
    name: "Nagelstudio's",
    emoji: "💅",
  },
  {
    name: "Spa & Wellness",
    emoji: "🧘‍♀️",
  },
  {
    name: "Schoonheidssalons",
    emoji: "💄",
  },
  {
    name: "Barbiers",
    emoji: "💇‍♂️",
  },
  {
    name: "Massage",
    emoji: "🤲",
  },
];

const Page = () => {
  const [openCard, setOpenCard] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchText, setSearchText] = useState("");

  const router = useRouter();

  const onClearAll = () => {
    setSelectedCategory(0);
    setOpenCard(0);
    setSearchText("");
  };

  return (
    <BlurView intensity={70} style={styles.container} tint="light">
      {/* Salon Type */}
      <View style={styles.card}>
        {openCard != 0 && (
          <AnimatedTouchableOpacity
            onPress={() => setOpenCard(0)}
            style={styles.cardPreview}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
          >
            <Text style={styles.previewText}>Type</Text>
            <Text style={styles.previewdData}>
              {salonCategories[selectedCategory].name}
            </Text>
          </AnimatedTouchableOpacity>
        )}

        {openCard == 0 && (
          <Text style={styles.cardHeader}>Welk type salon?</Text>
        )}
        {openCard == 0 && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.cardBody}
          >
            <View style={styles.searchSection}>
              <Ionicons
                style={styles.searchIcon}
                name="search"
                size={20}
                color="#000"
              />
              <TextInput
                style={styles.inputField}
                placeholder="Zoek salons..."
                placeholderTextColor={Colors.grey}
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {salonCategories.map((item, index) => (
                <TouchableOpacity
                  onPress={() => setSelectedCategory(index)}
                  key={index}
                  style={styles.categoryItem}
                >
                  <View
                    style={[
                      styles.categoryEmoji,
                      selectedCategory === index &&
                        styles.categoryEmojiSelected,
                    ]}
                  >
                    <Text style={styles.emojiText}>{item.emoji}</Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryText,
                      selectedCategory === index && styles.categoryTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </View>

      {/* Footer */}
      <Animated.View
        style={defaultStyles.footer}
        entering={SlideInDown.delay(200)}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            style={{ height: "100%", justifyContent: "center" }}
            onPress={onClearAll}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "mon-sb",
                textDecorationLine: "underline",
              }}
            >
              Alles wissen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[defaultStyles.btn, { paddingRight: 20, paddingLeft: 50 }]}
            onPress={() => {
              router.back();
              // Pass search parameters back via router params
              router.setParams({
                searchTerm: searchText,
              });
            }}
          >
            <Ionicons
              name="search-outline"
              size={24}
              style={defaultStyles.btnIcon}
              color={"#fff"}
            />
            <Text style={defaultStyles.btnText}>Zoeken</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    margin: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {
      width: 2,
      height: 2,
    },
    gap: 20,
  },
  cardHeader: {
    fontFamily: "mon-b",
    fontSize: 24,
    padding: 20,
  },
  cardBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardPreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },

  searchSection: {
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ABABAB",
    borderRadius: 8,
    marginBottom: 16,
  },
  searchIcon: {
    padding: 10,
  },
  inputField: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  categoriesContainer: {
    flexDirection: "row",
    gap: 20,
    paddingVertical: 10,
  },
  categoryItem: {
    alignItems: "center",
    minWidth: 80,
  },
  categoryEmoji: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryEmojiSelected: {
    backgroundColor: Colors.primary + "20",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  emojiText: {
    fontSize: 24,
  },
  categoryText: {
    fontFamily: "mon",
    fontSize: 12,
    textAlign: "center",
    color: Colors.grey,
  },
  categoryTextSelected: {
    color: Colors.primary,
    fontFamily: "mon-sb",
  },
  previewText: {
    fontFamily: "mon-sb",
    fontSize: 14,
    color: Colors.grey,
  },
  previewdData: {
    fontFamily: "mon-sb",
    fontSize: 14,
    color: Colors.dark,
  },
});
export default Page;
