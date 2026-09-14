import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { defaultStyles } from "@/constants/Styles";
import * as Linking from "expo-linking";
import { useAuth } from "../_layout";

const Page = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  // Clear unconfirmed email state when user is authenticated
  useEffect(() => {
    if (session && unconfirmedEmail) {
      console.log("✅ User authenticated, clearing unconfirmed email state");
      setUnconfirmedEmail("");
      // Close the modal since user is now authenticated
      router.back();
    }
  }, [session, unconfirmedEmail, router]);

  const clearForm = () => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
  };

  const toggleSignUp = () => {
    setIsSignUp(!isSignUp);
    clearForm();
    setUnconfirmedEmail("");
  };

  const isEmailUnconfirmedError = (error: any) => {
    return (
      error.message.includes("already registered") ||
      error.message.includes("User already registered") ||
      error.message.includes("Email not confirmed") ||
      error.message.includes("Invalid login credentials")
    );
  };

  const handleResendConfirmation = async () => {
    setResendLoading(true);
    try {
      const redirectUrl = Linking.createURL("/auth-callback");
      console.log("Resend confirmation redirect URL:", redirectUrl);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unconfirmedEmail,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) throw error;

      Alert.alert(
        "Confirmation Email Sent",
        "Please check your email and click the verification link."
      );
      setResendLoading(false);
    } catch (error: any) {
      Alert.alert("Error", error.message);
      setResendLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (isSignUp && (!firstName || !lastName)) {
      Alert.alert("Error", "Please enter your first and last name");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const redirectUrl = Linking.createURL("/auth-callback");
        console.log("Sign up redirect URL:", redirectUrl);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: firstName,
              last_name: lastName,
              phone: phone || null,
            },
          },
        });

        if (error) {
          if (isEmailUnconfirmedError(error)) {
            setUnconfirmedEmail(email);
          } else {
            throw error;
          }
        } else if (data.user && !data.user.email_confirmed_at) {
          setUnconfirmedEmail(email);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (isEmailUnconfirmedError(error)) {
            setUnconfirmedEmail(email);
          } else {
            throw error;
          }
        } else if (data.user) {
          router.back();
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL("/auth-callback");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Show unconfirmed email screen
  if (unconfirmedEmail) {
    return (
      <View style={styles.container}>
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Ionicons
            name="mail-outline"
            size={64}
            color={Colors.primary}
            style={{ marginBottom: 20 }}
          />
          <Text
            style={{ fontSize: 18, fontFamily: "mon-sb", marginBottom: 10 }}
          >
            Email Not Confirmed
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: Colors.grey,
              textAlign: "center",
              marginBottom: 30,
            }}
          >
            We sent a confirmation link to {unconfirmedEmail}. Please click the
            link in your email to verify your account.
          </Text>

          <TouchableOpacity
            style={[defaultStyles.btn, resendLoading && { opacity: 0.5 }]}
            onPress={handleResendConfirmation}
            disabled={resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={defaultStyles.btnText}>Resend Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUnconfirmedEmail("")}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: Colors.primary, fontFamily: "mon-sb" }}>
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isSignUp && (
        <>
          <TextInput
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            style={[defaultStyles.inputField, { marginBottom: 10 }]}
          />
          <TextInput
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            style={[defaultStyles.inputField, { marginBottom: 10 }]}
          />
          <TextInput
            placeholder="Phone Number (Optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[defaultStyles.inputField, { marginBottom: 10 }]}
          />
        </>
      )}

      <TextInput
        autoCapitalize="none"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={[defaultStyles.inputField, { marginBottom: 10 }]}
      />

      <TextInput
        autoCapitalize="none"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[defaultStyles.inputField, { marginBottom: 10 }]}
      />

      <TouchableOpacity
        style={[defaultStyles.btn, loading && { opacity: 0.5 }]}
        onPress={handleEmailAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={defaultStyles.btnText}>
            {isSignUp ? "Sign Up" : "Sign In"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={toggleSignUp} style={{ marginTop: 10 }}>
        <Text
          style={{
            textAlign: "center",
            color: Colors.primary,
            fontFamily: "mon-sb",
          }}
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>

      <View style={styles.seperatorView}>
        <View style={styles.line} />
        <Text style={styles.seperator}>or</Text>
        <View style={styles.line} />
      </View>

      <View style={{ gap: 20 }}>
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => handleOAuthSignIn("apple")}
          disabled={loading}
        >
          <Ionicons name="logo-apple" size={24} style={defaultStyles.btnIcon} />
          <Text style={styles.btnOutlineText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => handleOAuthSignIn("google")}
          disabled={loading}
        >
          <Ionicons
            name="logo-google"
            size={24}
            style={defaultStyles.btnIcon}
          />
          <Text style={styles.btnOutlineText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Page;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 26,
  },
  seperatorView: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginVertical: 30,
  },
  seperator: {
    fontFamily: "mon-sb",
    color: Colors.grey,
    fontSize: 16,
  },
  line: {
    flex: 1,
    borderBottomColor: "black",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  btnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.grey,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  btnOutlineText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "mon-sb",
  },
});
