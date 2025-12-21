import { Alert, View, Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { userDataManager } from "../../lib/UserDataManager";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    await userDataManager.clearCache();

    if (error) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      Alert.alert("Error", "Session did not clear. Please try again.");
      return;
    }

    router.replace("/");
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoutButton: {
    backgroundColor: '#005c82',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
