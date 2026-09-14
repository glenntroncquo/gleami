import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter } from "expo-router";
import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/Colors";
import ModalHeaderText from "@/components/ModalHeaderText";
import { TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";

// Create Auth Context
type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [loaded, error] = useFonts({
    mon: require("../assets/fonts/Montserrat-Regular.ttf"),
    "mon-sb": require("../assets/fonts/Montserrat-SemiBold.ttf"),
    "mon-b": require("../assets/fonts/Montserrat-Bold.ttf"),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Check for existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle deep linking for email verification
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      console.log("Deep link received:", url);

      // Check if this is an auth callback URL with tokens
      if (url.includes("/auth-callback") && url.includes("#")) {
        const hashPart = url.split("#")[1];
        if (hashPart) {
          const hashParams = new URLSearchParams(hashPart);
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const error = hashParams.get("error");
          const errorDescription = hashParams.get("error_description");

          if (error) {
            console.error(
              "Auth error from deep link:",
              error,
              errorDescription
            );
            return;
          }

          if (accessToken && refreshToken) {
            console.log("✅ Tokens found in deep link, setting session...");

            // Set the session with the tokens from the URL
            const { data, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              console.error("Session error:", sessionError);
            } else {
              console.log(
                "✅ Session restored from deep link:",
                data.session?.user.email
              );
            }
          }
        }
      }
      // Expo Router will automatically navigate to the correct route
    };

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Handle app open from deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  if (!loaded || isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      <RootLayoutNav />
    </AuthContext.Provider>
  );
}

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  // No automatic login required - users can use the app without authentication

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen
          name="(modals)/login"
          options={{
            presentation: "modal",
            title: "Log in or sign up",
            headerTitleStyle: {
              fontFamily: "mon-sb",
            },
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="close-outline" size={28} />
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ headerTitle: "" }} />
        <Stack.Screen
          name="(modals)/booking"
          options={{
            presentation: "transparentModal",
            animation: "fade",
            headerTransparent: true,
            headerTitle: (props) => <ModalHeaderText />,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  backgroundColor: "#fff",
                  borderColor: Colors.grey,
                  borderRadius: 20,
                  borderWidth: 1,
                  padding: 4,
                }}
              >
                <Ionicons name="close-outline" size={22} />
              </TouchableOpacity>
            ),
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
