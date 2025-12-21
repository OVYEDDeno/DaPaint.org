import { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Platform, Image, LayoutChangeEvent } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  DaPaint,
  getAvailableDaPaints,
  getExploreDaPaints,
  joinDaPaint,
  getActiveDaPaint,
  canUserJoinDaPaint,
} from "../../lib/api/dapaints";
import { attachUserImagesToDaPaints } from "../../lib/api/attachUserImages";
import logger from "../../lib/logger";
import SwipeFeed from "../../components/swipe/SwipeFeed";
import EmptyFeed from "../../components/swipe/EmptyFeed";
import AdScreen from "../../components/swipe/AdScreen";
import MatchScreen from "../../components/swipe/MatchScreen";
import { theme } from "../../constants/theme";
import BackgroundLayer from "../../components/ui/BackgroundLayer";
import { userDataManager } from "../../lib/UserDataManager";

const WINSTREAK_GOAL = 30;

export default function FeedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"feed" | "explore">("feed");
  const [dapaints, setDaPaints] = useState<DaPaint[]>([]);
  const [exploreDaPaints, setExploreDaPaints] = useState<DaPaint[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [matchedDaPaint, setMatchedDaPaint] = useState<DaPaint | null>(null);
  const [pendingMatch, setPendingMatch] = useState<DaPaint | null>(null);

  const [showAd, setShowAd] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const userId = userData?.id;
      if (!userId) return;

      const feedListRaw = await getAvailableDaPaints(userId);
      const feedList = await attachUserImagesToDaPaints(feedListRaw);
      setDaPaints(feedList);

      const exploreListRaw = await getExploreDaPaints(userId);
      const exploreList = await attachUserImagesToDaPaints(exploreListRaw);
      setExploreDaPaints(exploreList);
    } catch (error) {
      logger.error("Error loading feed:", error);
      Alert.alert("Error", "Failed to load your feed. Please try again.");
      setDaPaints([]);
      setExploreDaPaints([]);
    }
  }, [userData]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          logger.debug("No session found, redirecting to login");
          await userDataManager.clearCache();
          router.replace("/");
          return;
        }

        const data = await userDataManager.getUserData(true);
        if (!data) {
          logger.debug("No user data found, redirecting to login");
          router.replace("/");
          return;
        }
        setUserData(data);
      } catch (error) {
        logger.error("Error loading user data:", error);
        router.replace("/");
      }
    };

    loadUserData();
  }, [router]);

  useEffect(() => {
    if (userData) loadFeed();
  }, [userData, loadFeed]);

  // Real-time subscription for user profile changes (including winstreak updates)
  useEffect(() => {
    if (!userData?.id) return;

    const channel = supabase
      .channel(`user-profile-changes:${userData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userData.id}`
        },
        async (payload) => {
          // Update local user data when profile changes
          const updatedUser = (payload as any).new;
          setUserData(updatedUser);
          
          // Also update the cached user data in userDataManager
          userDataManager.updateCachedUserData(updatedUser);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.id]);

  const handleCreateDaPaint = () => router.push("/(tabs)/active");
  const handleFeelingLucky = () => setActiveTab("explore");
  const handleGoToActive = () => router.push("/(tabs)/active");
  const handleHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height);
  }, []);

  const handleSwipeLeft = (dapaint: DaPaint) => {
    logger.debug(`Swiped left on ${dapaint.dapaint}`);
  };

  const handleSwipeRight = async (dapaint: DaPaint) => {
    logger.debug(`Swiped right on ${dapaint.dapaint}`);
    if (joining) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || !userData?.id) {
      router.replace("/");
      return;
    }

    // Guard: Check if user can join with detailed 48-hour logic
    const joinCheck = await canUserJoinDaPaint(userData.id, dapaint);
    if (!joinCheck.canJoin) {
      Alert.alert(
        "Action Required",
        joinCheck.message,
        [{ text: "OK" }]
      );
      return;
    }

    setPendingMatch(dapaint);
    setShowAd(true);
  };

  const handleEditOwn = () => router.push("/(tabs)/active");

  const handleDeleteOwn = () => {
    Alert.alert(
      "Delete DaPaint?",
      "Are you sure you want to delete your DaPaint? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            logger.debug("User confirmed deletion of own DaPaint");
            // TODO: implement delete
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    } else {
      router.replace("/");
    }
  };

  const handleAdComplete = useCallback(() => {
    setShowAd(false);

    if (!pendingMatch || !userData || joining) return;

    const processJoin = async () => {
      try {
        setJoining(true);
        const result = await joinDaPaint(pendingMatch.id, userData.id, userData.display_name);

        if (!result.success) {
          // Handle the case where user is already in an active DaPaint
          if (result.currentDaPaint) {
            Alert.alert("Already in a DaPaint", result.message);
          } else {
            Alert.alert("Cannot Join", result.message);
          }
          setPendingMatch(null);
          return;
        }

        setMatchedDaPaint(pendingMatch);
        setPendingMatch(null);
      } catch (error: any) {
        logger.error("Error joining DaPaint:", error);

        const errorMsg = error?.message || "Failed to join DaPaint";
        if (typeof errorMsg === "string" && errorMsg.includes("already taken")) {
          Alert.alert("Oops!", "Someone just joined this DaPaint!");
        } else if (typeof errorMsg === "string" && errorMsg.includes("already in an active DaPaint")) {
          Alert.alert("Already Joined", "You're already in an active DaPaint. Please complete or leave it first.");
        } else {
          Alert.alert("Error", errorMsg);
        }

        setPendingMatch(null);
      } finally {
        setJoining(false);
      }
    };

    processJoin();
  }, [pendingMatch, userData, joining]);

  const handleMatchContinue = useCallback(() => {
    setMatchedDaPaint(null);
    loadFeed();
  }, [loadFeed]);

  const currentDaPaints = activeTab === "feed" ? dapaints : exploreDaPaints;
  const winstreakValue = userData?.current_winstreak ?? 0;
  const winstreakProgress = Math.min(1, winstreakValue / WINSTREAK_GOAL);
  const winsLeft = Math.max(0, WINSTREAK_GOAL - winstreakValue);

  if (showAd) {
    return (
      <AdScreen
        onComplete={handleAdComplete}
      />
    );
  }

  if (matchedDaPaint) {
    return (
      <MatchScreen
        dapaint={matchedDaPaint}
        onContinue={handleMatchContinue}
        onGoToActive={handleGoToActive}
      />
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundLayer />
      {/* Header */}
      <View style={styles.header} onLayout={handleHeaderLayout}>
        <View style={styles.progressCluster}>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{winstreakValue}</Text>
          </View>

          <View style={styles.barWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${winstreakProgress * 100}%` }]} />
            </View>
            <Image source={require("../../assets/logo.png")} style={styles.logoOverlay} resizeMode="contain" />
          </View>

          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{WINSTREAK_GOAL}</Text>
          </View>
        </View>

        <Text style={styles.motivation}>
          {winsLeft} left until you're a millionaire.
        </Text>

      </View>

      {/* Content */}
      {currentDaPaints.length === 0 ? (
        <EmptyFeed
          userWinstreak={winstreakValue}
          userZipcode={userData?.zipcode || ""}
          onCreateDaPaint={handleCreateDaPaint}
          onFeelingLucky={handleFeelingLucky}
        />
      ) : (
        <SwipeFeed
          dapaints={currentDaPaints}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          topOffset={headerHeight}
          onExhausted={() => {
            if (activeTab === "feed") {
              setDaPaints([]);
            } else {
              setExploreDaPaints([]);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 52 : 28,
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.md,
    backgroundColor: 'transparent',
    alignItems: "center",
    gap: theme.space.xs,
    zIndex: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: theme.space.md,
  },
  progressCluster: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    paddingHorizontal: 0,
  },
  winstreakValue: {
    ...theme.type.displaySmall,
    color: theme.colors.primaryDeep,
    fontWeight: "700",
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginHorizontal: theme.space.md,
  },
  progressTrack: {
    width: "100%",
    height: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 12,
    backgroundColor: theme.colors.primaryDeep,
  },
  logoOverlay: {
    position: "absolute",
    top: -10,
    left: "50%",
    marginLeft: -36,
    width: 72,
    height: 32,
  },
  progressBadge: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 64,
    alignItems: "center",
  },
  progressBadgeText: {
    ...theme.type.displaySmall,
    color: theme.colors.primaryDeep,
    fontWeight: "700",
  },
  logo: {
    width: 86,
    height: 40,
  },
  settingsButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 28,
    right: theme.space.md,
    width: 46,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  settingsIcon: {
    fontSize: 22,
    color: theme.colors.textPrimary,
  },
  motivation: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: "center",
    width: "100%",
  },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: theme.space.md,
    paddingBottom: theme.space.sm,
    gap: theme.space.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.full,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: "rgba(46,196,255,0.14)",
    borderColor: "rgba(46,196,255,0.30)",
  },
  tabText: {
    ...theme.type.labelMedium,
    color: 'rgba(0,92,130,0.65)',
  },
  tabTextActive: {
    color: '#005c82',
  },
});
