import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getSession, signOut, signIn } from "../../lib/api/auth";
import { userDataManager } from "../../lib/UserDataManager";
import logger from "../../lib/logger";
import { theme } from "../../constants/theme";
import { getKeyboardDismissHandler, stopEventOnWeb } from "../../lib/webFocusGuard";

const BASE_BOTTOM_PADDING = Platform.OS === "ios" ? 20 : 16;
const MAX_KEYBOARD_LIFT = 80; // prevent sheet from overshooting the logo

interface AuthSectionProps {
  keyboardOffset: number;
}

export default function AuthSection({ keyboardOffset }: AuthSectionProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Check for existing session when component mounts
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const session = await getSession();
  
        if (session) {
          logger.debug("User already logged in, checking profile...");
  
          try {
            const { data: userProfile, error: profileError } = await supabase
              .from("users")
              .select("id")
              .eq("id", session.user.id)
              .single();
  
            if (profileError || !userProfile) {
              logger.debug("Authenticated user missing profile, signing out...");
              await signOut();
              await userDataManager.clearCache();
              Alert.alert("Session Error", "Please log in again to continue.");
              setSessionChecked(true);
              return;
            }
  
            logger.debug("User profile found, redirecting to feed");
            await userDataManager.preloadUserData();
            router.replace("/(tabs)/feed");
            return;
          } catch (profileError) {
            logger.error("Error checking user profile:", profileError);
            await signOut();
            await userDataManager.clearCache();
          }
        }
      } catch (error) {
        logger.error("Unexpected error checking existing session:", error);
        try {
          await signOut();
          await userDataManager.clearCache();
        } catch (signOutError) {
          logger.error("Error during sign out:", signOutError);
        }
      } finally {
        setSessionChecked(true);
      }
    };
  
    checkExistingSession();
  }, [router]);

  const handleCheckUsername = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("username", username.trim().toLowerCase())
        .maybeSingle();
      if (error) {
        logger.error("Error checking username:", error);
        Alert.alert("Error", "Failed to check username");
        return;
      }

      if (data) {
        setShowPasswordInput(true);
        userDataManager.preloadUserData();
      } else {
        router.push(
          `/(auth)/signup?username=${encodeURIComponent(
            username.trim().toLowerCase()
          )}`
        );
      }
    } catch (err) {
      logger.error("Unexpected error:", err);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const normalizedUsername = username.toLowerCase().trim();

      const { data: userExists, error: checkError } = await supabase
        .from("users")
        .select("username")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (checkError) {
        logger.error("Error checking username:", checkError);
        Alert.alert("Error", "Failed to check username");
        return;
      }

      if (!userExists) {
        Alert.alert("Username Not Found", "Please check your username and try again.");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("username", normalizedUsername)
        .single();

      if (userError || !userData) {
        logger.error("Error getting user email:", userError);
        Alert.alert("Error", "Failed to retrieve user information");
        return;
      }

      const signInResult = await signIn(userData.email, password);

      if (!signInResult.success) {
        logger.error("Sign in error:", signInResult.error);
        Alert.alert("Login Failed", signInResult.error?.message || "Invalid credentials. Please try again.");
        return;
      }

      await userDataManager.preloadUserData();
      router.replace("/(tabs)/feed");
    } catch (err) {
      logger.error("Login error:", err);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  if (!sessionChecked) {
    return null;
  }

  const keyboardPadding = Math.min(keyboardOffset, MAX_KEYBOARD_LIFT);
  const basePadding = Math.max(insets.bottom, BASE_BOTTOM_PADDING);
  const dismissKeyboard = getKeyboardDismissHandler();

  return (
    <Pressable onPress={dismissKeyboard} accessible={false} style={styles.touchGuard}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <View style={styles.sheetWrapper}>
          <View
            style={[
              styles.bottomContainer,
              { paddingBottom: basePadding, marginBottom: keyboardPadding },
            ]}
          >
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms and Privacy Policy.
            </Text>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Enter Your Username</Text>
                <View style={styles.inputRow}>
                  <View style={[styles.inputWrapper, !showPasswordInput && styles.inputWrapperWithCta]}>
                    <Text style={styles.inputPrefix}>@</Text>
                    <TextInput
                      style={styles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholder="username"
                      placeholderTextColor={theme.colors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      textContentType="username"
                      returnKeyType={showPasswordInput ? "next" : "done"}
                      onSubmitEditing={() => (showPasswordInput ? undefined : handleCheckUsername())}
                      autoFocus={!showPasswordInput}
                      onPressIn={stopEventOnWeb}
                    />
                  </View>
                  {!showPasswordInput && (
                    <Pressable
                      style={[styles.inlineCtaButton]}
                      onPress={handleCheckUsername}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>{loading ? "Checking..." : "Continue — it‘s free!"}</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {showPasswordInput && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Enter Your Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="password"
                      placeholderTextColor={theme.colors.textTertiary}
                      secureTextEntry
                      editable={!loading}
                      textContentType="password"
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                      autoFocus={showPasswordInput}
                      onPressIn={stopEventOnWeb}
                    />
                  </View>
                </View>
              )}

              <View style={styles.ctaContainer}>
                {showPasswordInput && (
                  <Pressable
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleLogin}
                    disabled={loading || !password}
                  >
                    <Text style={styles.buttonText}>{loading ? "Signing In..." : "Sign In"}</Text>
                  </Pressable>
                )}
                {showPasswordInput && (
                  <Pressable
                    style={styles.backButton}
                    onPress={() => {
                      setShowPasswordInput(false);
                      setPassword("");
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.backButtonText}>Wrong username? Try again</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchGuard: { flex: 1 },
  kav: { flex: 1 },
  // Wrapper keeps the form near the bottom but allows the keyboard to lift it like signup
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 0,
    zIndex: 5,
  },
  bottomContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 18,
    width: "94%",
    alignSelf: "center",
    maxWidth: Platform.OS === "web" ? 460 : 420,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 9,
    ...Platform.select({
      web: {
        boxShadow: "0px -4px 12px rgba(0,0,0,0.15)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
    gap: 14,
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "center",
    opacity: 0.7,
  },
  formContainer: {
    gap: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceStrong,
    minHeight: 48,
  },
  inputWrapperWithCta: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  inputPrefix: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    paddingLeft: 12,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: theme.colors.textPrimary,
    fontSize: 16,
    textAlign: "left",
    textAlignVertical: "center",
    backgroundColor: "transparent",
  },
  inlineCtaButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    backgroundColor: theme.colors.primaryDeep,
    borderWidth: 1.5,
    borderLeftWidth: 0,
    borderColor: theme.colors.primaryDeep,
    ...(Platform.OS === "web" ? { cursor: "pointer", userSelect: "none" } : null),
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  ctaContainer: {
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: theme.colors.primaryDeep,
    shadowColor: theme.colors.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
});
