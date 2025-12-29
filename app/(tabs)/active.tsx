// app/(tabs)/active.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import ActiveDaPaint from "../../components/swipe/ActiveDaPaint";
import { leaveDaPaint } from "../../lib/api/dapaints";
import logger from "../../lib/logger";
import type { DaPaint } from "../../lib/api/dapaints";
import CreateForm from "../../components/swipe/CreateForm";
import AdScreen from "../../components/swipe/AdScreen";
import BackgroundLayer from "../../components/ui/BackgroundLayer";
import { theme } from "../../constants/theme";
import { getKeyboardDismissHandler } from "../../lib/webFocusGuard";
import { userDataManager } from "../../lib/UserDataManager";
import { daPaintDataManager } from "../../lib/DaPaintDataManager";
import FeedbackButton from "../../components/ui/FeedbackButton";

export default function CreateDaPaintScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fromCreate, fromMatch, fromEdit } = {
    fromCreate: params.fromCreate as string || '',
    fromMatch: params.fromMatch as string || '',
    fromEdit: params.fromEdit as string || '',
  };
  const [_loading, setLoading] = useState(true);
  const [activeDaPaint, setActiveDaPaint] = useState<DaPaint | null>(null);
  const shouldShowAd =
    fromCreate === "true" || fromMatch === "true" || fromEdit === "true";
  const [showAd, setShowAd] = useState(shouldShowAd);
  const [userData, setUserData] = useState<{
    id: string;
    display_name: string;
    current_winstreak: number;
  } | null>(null);
  
  // Ref to track if we're currently loading data to prevent infinite loops
  const isLoadingRef = useRef(false);
  const dismissKeyboard = getKeyboardDismissHandler();
  
  // Ref to store the pauseVideo function from AdScreen
  const pauseVideoRef = useRef<(() => void) | null>(null);
  
  // Effect to handle tab bar visibility based on screen state
  useEffect(() => {
    const globalAny: any = global;
    if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
      const shouldShowTabBar = showAd
        ? false  // Hide tab bar when showing ad
        : true;   // Show tab bar in all other cases (active DaPaint, create form, loading)
      globalAny.setTabBarVisibility(shouldShowTabBar);
    }
    
    return () => {
      // Show tab bar when component unmounts
      if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
        globalAny.setTabBarVisibility(true);
      }
    };
  }, [showAd]);

  // Preload data on component mount
  useEffect(() => {
    // Kick off background preloads, then use cached data if available.
    userDataManager.preloadUserData();
    daPaintDataManager.preloadActiveDaPaint();
    
    const loadInitialData = async () => {
      if (!isLoadingRef.current) {
        setLoading(true);
        try {
          await loadData();
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadInitialData();
  }, []);



  const loadData = async (): Promise<void> => {
    // Prevent multiple simultaneous calls to loadData to avoid infinite loops
    if (isLoadingRef.current) {
      return;
    }
    
    isLoadingRef.current = true;
    try {
      const cachedUserData = await userDataManager.getUserData();
      if (!cachedUserData) {
        Alert.alert("Error", "Please sign in to create a DaPaint");
        router.replace("/");
        return;
      }
      setUserData({
        id: cachedUserData.id,
        display_name: cachedUserData.display_name,
        current_winstreak: cachedUserData.current_winstreak,
      });

      // Check for active DaPaint using the API function
      const myActiveDaPaint = await daPaintDataManager.getActiveDaPaint();
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
      isLoadingRef.current = false;
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setShowAd(shouldShowAd);
      
      // Only load data if not currently loading to prevent infinite loops
      if (!isLoadingRef.current) {
        loadData();
      }
      
      // When screen comes into focus and AdScreen is showing, try to resume if needed
      if (showAd && pauseVideoRef.current) {
        // We don't resume the video here, just ensure we're tracking the ref
      }
      
      return () => {
        // When screen loses focus, pause the video if AdScreen is active
        if (pauseVideoRef.current) {
          pauseVideoRef.current();
        }
      };
    }, [shouldShowAd])
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
      
      if (!isLoadingRef.current) {
        await loadData().catch(error => {
          logger.error('Error reloading data after leaving DaPaint:', error);
        });
      }
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
  
  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    // After ad completes, ensure we transition appropriately
    // The renderContent function will automatically show the correct component
    // based on whether there's an active DaPaint or not
    
    // If we came from the match screen, create flow, or edit flow, replace the URL to remove the parameters
    // to avoid showing ads repeatedly when navigating back to this screen
    if (shouldShowAd) {
      router.replace('/(tabs)/active');
    }
  }, [shouldShowAd]);
  
  // Function to set the pauseVideo function from AdScreen
  const setPauseVideoFunction = useCallback((pauseFunction: (() => void) | null) => {
    pauseVideoRef.current = pauseFunction;
    
    // Clean up the ref when AdScreen unmounts
    return () => {
      pauseVideoRef.current = null;
    };
  }, []);

  const renderContent = () => {
    // Show ad if needed
    if (showAd) {
      return (
        <AdScreen onComplete={handleAdComplete} setPauseFunction={setPauseVideoFunction} />
      );
    }
    
    // Avoid blocking the UI while user data hydrates from cache.
    if (!userData) {
      return <View style={styles.container} />;
    }

    if (activeDaPaint) {
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

    return <CreateForm userData={userData} onCreated={async () => {
      if (!isLoadingRef.current) {
        try {
          await loadData();
        } catch (error) {
          logger.error('Error reloading data after creating DaPaint:', error);
        }
      }
    }} />;
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
      
      {/* Feedback Button */}
      <FeedbackButton visible={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
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
