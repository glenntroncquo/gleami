import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useMemo, useRef, useState } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import Listings from "@/components/Listings";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import type { Company } from "@/hooks/useCompanies";
import { Easing } from "react-native-reanimated";

interface Props {
  listings: Company[];
  category: string;
  animationDirection: "left" | "right";
}

// Bottom sheet that wraps our Listings component
const ListingsBottomSheet = ({
  listings,
  category,
  animationDirection,
}: Props) => {
  const snapPoints = useMemo(() => ["12%", "50%", "100%"], []);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [refresh, setRefresh] = useState<number>(0);

  const animationConfigs = useMemo(
    () => ({
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    []
  );

  const onShowMap = () => {
    bottomSheetRef.current?.collapse();
    setRefresh(refresh + 1);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={2}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableOverDrag={false}
      handleIndicatorStyle={{ backgroundColor: Colors.grey }}
      style={styles.sheetContainer}
      animationConfigs={animationConfigs}
      activeOffsetY={[-10, 10]}
      failOffsetX={[-10, 10]}
    >
      <View style={styles.contentContainer}>
        <Listings
          listings={listings}
          refresh={refresh}
          category={category}
          animationDirection={animationDirection}
        />
        <View style={styles.absoluteView}>
          <TouchableOpacity onPress={onShowMap} style={styles.btn}>
            <Text style={{ fontFamily: "mon-sb", color: "#fff" }}>Map</Text>
            <Ionicons
              name="map"
              size={20}
              style={{ marginLeft: 10 }}
              color={"#fff"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  absoluteView: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    alignItems: "center",
    zIndex: 1000,
  },
  btn: {
    backgroundColor: Colors.dark,
    padding: 14,
    height: 50,
    borderRadius: 30,
    flexDirection: "row",
    marginHorizontal: "auto",
    alignItems: "center",
  },
  sheetContainer: {
    marginTop: 30,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {
      width: 1,
      height: 1,
    },
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default ListingsBottomSheet;
