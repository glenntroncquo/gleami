import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useEffect } from "react";

const ListingSkeleton = () => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.image, animatedStyle]} />
      <View style={styles.content}>
        <Animated.View style={[styles.title, animatedStyle]} />
        <Animated.View style={[styles.subtitle, animatedStyle]} />
        <Animated.View style={[styles.address, animatedStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 10,
    marginVertical: 16,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  content: {
    gap: 8,
  },
  title: {
    height: 20,
    width: "60%",
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  subtitle: {
    height: 16,
    width: "40%",
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  address: {
    height: 16,
    width: "80%",
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
});

export default ListingSkeleton;
