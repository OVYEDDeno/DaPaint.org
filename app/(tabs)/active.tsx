// app/(tabs)/active.tsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import ActiveDaPaint from "../../components/swipe/ActiveDaPaint";
import { leaveDaPaint, getActiveDaPaint } from "../../lib/api/dapaints";
import logger from "../../lib/logger";
import type { DaPaint } from "../../lib/api/dapaints";
import CreateForm from "../../components/swipe/CreateForm";
import BackgroundLayer from "../../components/ui/BackgroundLayer";
import { theme } from "../../constants/theme";
import { getKeyboardDismissHandler } from "../../lib/webFocusGuard";

export default function CreateDaPaintScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeDaPaint, setActiveDaPaint] = useState<DaPaint | null>(null);
  const [userData, setUserData] = useState<{
    id: string;
    display_name: string;
    current_winstreak: number;
  } | null>(null);
  const dismissKeyboard = getKeyboardDismissHandler();

  // Check authentication on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.debug('No session found, redirecting to login');
        router.replace('/');
        return;
      }
      
      // If we get here, user is authenticated, proceed with normal loading
      loadData();
    } catch (error) {
      logger.error('Error checking auth:', error);
      router.replace('/');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Please sign in to create a DaPaint");
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, display_name, current_winstreak")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserData(data);

      // Check for active DaPaint using the API function
      const myActiveDaPaint = await getActiveDaPaint(user.id);
      setActiveDaPaint(myActiveDaPaint);
      
      // Trigger a check in the tab layout to update the tab label
      const globalAny: any = global;
      if (typeof global !== 'undefined' && globalAny.checkActiveDaPaint) {
        globalAny.checkActiveDaPaint();
      }
    } catch (error) {
      logger.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleLeaveDaPaint = async () => {
    if (!activeDaPaint || !userData) return;
    
    const startsAt = new Date(activeDaPaint.starts_at);
    const now = new Date();
    const hoursUntilStart = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isWithin48Hours = hoursUntilStart <= 48;
    
    if (Platform.OS === 'web') {
      if (activeDaPaint.dapaint_type === '1v1' && isWithin48Hours && activeDaPaint.foe_id) {
        const shouldForfeit = window.confirm(
          '⚠️ Forfeit Warning\n\nYou are within 48 hours of start time. Leaving now means you FORFEIT and the other person wins. Continue?'
        );
        if (!shouldForfeit) return;
      } else {
        const shouldLeave = window.confirm('Leave DaPaint?\n\nAre you sure you want to leave?');
        if (!shouldLeave) return;
      }
    } else {
      if (activeDaPaint.dapaint_type === '1v1' && isWithin48Hours && activeDaPaint.foe_id) {
        Alert.alert(
          '⚠️ Forfeit Warning',
          'You are within 48 hours of start time. Leaving now means you FORFEIT and the other person wins. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Forfeit', style: 'destructive', onPress: () => confirmLeave() }
          ]
        );
        return;
      } else {
        Alert.alert(
          'Leave DaPaint?',
          'Are you sure you want to leave?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => confirmLeave() }
          ]
        );
        return;
      }
    }
    
    await confirmLeave();
  };
  
  const confirmLeave = async () => {
    if (!activeDaPaint) return;
    
    setLoading(true);
    try {
      const result = await leaveDaPaint(activeDaPaint.id);
      
      const message = result.forfeit 
        ? 'You forfeited the DaPaint. The other person wins.'
        : 'You have left the DaPaint';
        
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Success', message, [{ text: 'OK' }]);
      }
      
      await loadData();
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to leave DaPaint';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primaryDeep} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      );
    }

    if (activeDaPaint && userData) {
      return (
        <View style={styles.container}>
          <ActiveDaPaint
            dapaint={activeDaPaint}
            userId={userData.id}
            onLeave={handleLeaveDaPaint}
          />
        </View>
      );
    }

    return <CreateForm userData={userData} onCreated={loadData} />;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BackgroundLayer />
      <Pressable onPress={dismissKeyboard} accessible={false} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: theme.space.headerTop,
    paddingBottom: theme.space.headerBottom,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  activeContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
});
