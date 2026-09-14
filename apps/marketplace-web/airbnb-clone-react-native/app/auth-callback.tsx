import { useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { View, ActivityIndicator, Text } from "react-native";
import Colors from "@/constants/Colors";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Wait a moment for the session to be set by _layout.tsx
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if we have a session now
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        console.log(
          "✅ Auth callback complete, session active:",
          session.user.email
        );
      } else {
        console.log("⚠️ No session found after callback");
      }

      // Close the modal and return to the previous screen
      router.dismiss();
    };

    handleCallback();
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text
        style={{
          marginTop: 16,
          fontFamily: "mon",
          color: Colors.grey,
        }}
      >
        Verifying your account...
      </Text>
    </View>
  );
}
