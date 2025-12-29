import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Image } from 'react-native';

import AdScreen from '../../components/swipe/AdScreen';
import EmptyFeed from '../../components/swipe/EmptyFeed';
import MatchScreen from '../../components/swipe/MatchScreen';
import SwipeFeed from '../../components/swipe/SwipeFeed';
import BackgroundLayer from '../../components/ui/BackgroundLayer';
import FeedbackButton from '../../components/ui/FeedbackButton';
import { theme } from '../../constants/theme';
import { attachUserImagesToDaPaints } from '../../lib/api/attachUserImages';
import { getSession } from '../../lib/api/auth';
import {
  DaPaint,
  getAvailableDaPaints,
  getLuckyDaPaints,
  joinDaPaint,
  canUserJoinDaPaint,
} from '../../lib/api/dapaints';
import logger from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { userDataManager } from '../../lib/UserDataManager';

const WINSTREAK_GOAL = 30;
// Increase cache TTL from 60s to 5 minutes to reduce API calls
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;
const feedCache: {
  userId: string | null;
  feed: DaPaint[];
  updatedAt: number;
} = {
  userId: null,
  feed: [],
  updatedAt: 0,
};

const getCachedFeed = (userId: string) => {
  if (feedCache.userId !== userId) return null;
  if (Date.now() - feedCache.updatedAt > FEED_CACHE_TTL_MS) return null;
  return feedCache;
};

const updateFeedCache = (userId: string, feed: DaPaint[]) => {
  feedCache.userId = userId;
  // Use shallow copy to prevent accidental mutations
  feedCache.feed = [...feed];
  feedCache.updatedAt = Date.now();
};

export default function FeedScreen() {
  const router = useRouter();
  const [feedMode, setFeedMode] = useState<'feed' | 'lucky'>('feed');
  const [dapaints, setDaPaints] = useState<DaPaint[]>([]);
  const [userData, setUserData] = useState<any>(null);

  const [matchedDaPaint, setMatchedDaPaint] = useState<DaPaint | null>(null);
  const [pendingMatch, setPendingMatch] = useState<DaPaint | null>(null);

  const [showAd, setShowAd] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // Hide tab bar when ad is showing for full-screen experience
    const globalAny: any = global;
    if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
      globalAny.setTabBarVisibility(!showAd);
    }
    return () => {
      if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
        globalAny.setTabBarVisibility(true);
      }
    };
  }, [showAd]);

  const loadFeed = useCallback(async () => {
    try {
      const userId = userData?.id;
      if (!userId) return;

      logger.debug('Feed Query Debug Info:');
      logger.debug('User ID:', userId);
      logger.debug('User Winstreak:', userData?.current_winstreak);
      logger.debug('User Zipcode:', userData?.zipcode);
      logger.debug('User City:', userData?.city);

      const feedListRaw = await getAvailableDaPaints(userId);
      logger.debug('Feed results count:', feedListRaw.length);

      const feedList = await attachUserImagesToDaPaints(feedListRaw);
      setDaPaints(feedList);

      setFeedMode('feed');
      updateFeedCache(userId, feedList);

      logger.debug('✅ Results found:', feedList.length);
      if (feedList.length === 0) {
        logger.debug('⚠️ No DaPaints found with these filters');
      }
    } catch (error) {
      logger.error('Error loading feed:', error);
      Alert.alert('Error', 'Failed to load your feed. Please try again.');
      setDaPaints([]);
    }
  }, [userData]);

  const loadLuckyDaPaints = useCallback(async () => {
    try {
      const userId = userData?.id;
      if (!userId) return;

      const luckyListRaw = await getLuckyDaPaints(userId);
      const luckyList = await attachUserImagesToDaPaints(luckyListRaw);
      setDaPaints(luckyList);
      setFeedMode('lucky');
    } catch (error) {
      logger.error('Error loading lucky feed:', error);
      Alert.alert('Error', 'Failed to load lucky feed. Please try again.');
    }
  }, [userData]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const session = await getSession();
        if (!session) {
          logger.debug('No session found, redirecting to login');
          await userDataManager.clearCache();
          router.replace('/');
          return;
        }

        const cachedData = await userDataManager.getUserData();
        if (cachedData) {
          setUserData(cachedData);
        }

        const freshData = await userDataManager.getUserData(true);
        if (!freshData) {
          logger.debug('No user data found, redirecting to login');
          router.replace('/');
          return;
        }
        setUserData(freshData);
        if (
          !cachedData ||
          cachedData.current_winstreak !== freshData.current_winstreak ||
          cachedData.zipcode !== freshData.zipcode ||
          cachedData.city !== freshData.city
        ) {
          setHasLoaded(false);
        }
      } catch (error) {
        logger.error('Error loading user data:', error);
        router.replace('/');
      }
    };

    loadUserData();
  }, [router]);

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (userData && !hasLoaded) {
      const cached = getCachedFeed(userData.id);
      if (cached) {
        setDaPaints(cached.feed);
        setFeedMode('feed');
      }
      loadFeed();
      setHasLoaded(true);
    }
  }, [userData, loadFeed, hasLoaded]);

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
          filter: `id=eq.${userData.id}`,
        },
        async payload => {
          // Update local user data when profile changes
          const updatedUser = (payload as any).new;
          setUserData(updatedUser);

          // Also update the cached user data in userDataManager
          userDataManager.updateCachedUserData(updatedUser);

          // Only reload feed if winstreak changed significantly (to avoid continuous reloads)
          if (userData.current_winstreak !== updatedUser.current_winstreak) {
            setHasLoaded(false); // Allow feed to reload on next render
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.id, userData?.current_winstreak]);

  const handleCreateDaPaint = () => {
    // Navigate to the active tab with a flag to show ad
    router.push('/(tabs)/active?fromCreate=true');
  };

  const handleFeelingLucky = () => {
    // Load DaPaints from different zipcodes regardless of winstreak when feeling lucky
    if (userData?.id) {
      loadLuckyDaPaints();
    }
  };

  const handleGoToActive = () => router.push('/(tabs)/active?fromMatch=true');

  const handleSwipeLeft = (dapaint: DaPaint) => {
    logger.debug(`Swiped left on ${dapaint.dapaint}`);
  };

  const handleSwipeRight = async (dapaint: DaPaint) => {
    logger.debug(`Swiped right on ${dapaint.dapaint}`);
    if (joining) return;

    const session = await getSession();
    if (!session || !userData?.id) {
      router.replace('/');
      return;
    }

    // Guard: Check if user can join with detailed 48-hour logic
    const joinCheck = await canUserJoinDaPaint(userData.id);
    if (!joinCheck.canJoin) {
      Alert.alert('Action Required', joinCheck.message, [{ text: 'OK' }]);
      return;
    }

    setPendingMatch(dapaint);
    setShowAd(true);
  };

  const handleAdComplete = useCallback(() => {
    setShowAd(false);

    if (!pendingMatch || !userData || joining) return;

    const processJoin = async () => {
      try {
        setJoining(true);
        const result = await joinDaPaint(
          pendingMatch.id,
          userData.id,
          userData.display_name
        );

        if (!result.success) {
          // Handle the case where user is already in an active DaPaint
          if (result.currentDaPaint) {
            Alert.alert('Already in a DaPaint', result.message);
          } else {
            Alert.alert('Cannot Join', result.message);
          }
          setPendingMatch(null);
          return;
        }

        setMatchedDaPaint(pendingMatch);
        setPendingMatch(null);
      } catch (error: any) {
        const fallback = 'Failed to join DaPaint';
        let errorMsg: string =
          (typeof error === 'string' && error) ||
          error?.message ||
          error?.error_description ||
          error?.details ||
          error?.hint ||
          fallback;

        if (errorMsg === fallback) {
          try {
            const maybeJson = JSON.stringify(error);
            if (maybeJson && maybeJson !== '{}') errorMsg = maybeJson;
          } catch {
            // ignore
          }
        }

        logger.error('Error joining DaPaint:', errorMsg, error);
        if (
          typeof errorMsg === 'string' &&
          errorMsg.includes('already taken')
        ) {
          Alert.alert('Oops!', 'Someone just joined this DaPaint!');
        } else if (
          typeof errorMsg === 'string' &&
          errorMsg.includes('already in an active DaPaint')
        ) {
          Alert.alert(
            'Already Joined',
            "You're already in an active DaPaint. Please complete or leave it first."
          );
        } else {
          Alert.alert('Error', errorMsg);
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
    setHasLoaded(false);
    loadFeed();
  }, [loadFeed]);

  const currentDaPaints = dapaints;
  const isExploreEmpty = feedMode === 'lucky' && dapaints.length === 0;
  const winstreakValue = userData?.current_winstreak ?? 0;
  const winstreakProgress = Math.min(1, winstreakValue / WINSTREAK_GOAL);

  if (showAd) {
    return <AdScreen onComplete={handleAdComplete} />;
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
      <View style={styles.header}>
        <View style={styles.progressCluster}>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{winstreakValue}</Text>
          </View>

          <View style={styles.barWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${winstreakProgress * 100}%` },
                ]}
              />
            </View>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoOverlay}
              resizeMode="contain"
            />
          </View>

          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{WINSTREAK_GOAL}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {currentDaPaints.length === 0 ? (
        <EmptyFeed
          userWinstreak={winstreakValue}
          userZipcode={userData?.zipcode || ''}
          onCreateDaPaint={handleCreateDaPaint}
          onFeelingLucky={handleFeelingLucky}
          isExploreEmpty={isExploreEmpty}
        />
      ) : (
        <SwipeFeed
          dapaints={currentDaPaints}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          topOffset={0}
          onExhausted={() => {
            if (feedMode === 'lucky') {
              setFeedMode('feed');
              setHasLoaded(false);
              loadFeed();
              return;
            }
            setDaPaints([]);
          }}
        />
      )}

      {/* Feedback Button */}
      <FeedbackButton visible />
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: theme.space.md,
    position: 'relative',
  },
  container: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: theme.space.xs,
    paddingBottom: theme.space.md,
    paddingHorizontal: theme.space.md,
    paddingTop: Platform.OS === 'ios' ? 52 : 28,
    zIndex: 10,
  },
  logo: {
    height: 40,
    width: 86,
  },
  logoOverlay: {
    height: 32,
    left: '50%',
    marginLeft: -36,
    position: 'absolute',
    top: -10,
    width: 72,
  },
  progressBadge: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    minWidth: 64,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 6,
  },
  progressBadgeText: {
    ...theme.type.displaySmall,
    color: theme.colors.primaryDeep,
    fontWeight: '700',
  },
  progressCluster: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: 420,
    paddingHorizontal: 0,
    position: 'relative',
    width: '100%',
  },
  progressFill: {
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: 12,
    height: '100%',
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.space.md,
    justifyContent: 'space-between',
    width: '100%',
  },
  progressTrack: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 16,
    overflow: 'hidden',
    width: '100%',
  },
  settingsButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    position: 'absolute',
    right: theme.space.md,
    top: Platform.OS === 'ios' ? 52 : 28,
    width: 46,
  },
  settingsIcon: {
    color: theme.colors.textPrimary,
    fontSize: 22,
  },
  winstreakValue: {
    ...theme.type.displaySmall,
    color: theme.colors.primaryDeep,
    fontWeight: '700',
  },
});
