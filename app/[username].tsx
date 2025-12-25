import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getProfilePicUrl } from '../lib/profilePics';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import BackgroundLayer from '../components/ui/BackgroundLayer';
import AuthSection from '../components/landing/AuthSection';
import { DaPaintButtons, DaPaintColors, DaPaintRadius, DaPaintShadows, DaPaintSpacing, DaPaintTypography } from '../constants/DaPaintDesign';

const PUBLIC_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const publicProfileCache = new Map<string, { data: any; updatedAt: number }>();

const getCachedPublicProfile = (username: string) => {
  const cached = publicProfileCache.get(username);
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > PUBLIC_PROFILE_CACHE_TTL_MS) {
    return null;
  }
  return cached.data;
};

const setCachedPublicProfile = (username: string, data: any) => {
  publicProfileCache.set(username, { data, updatedAt: Date.now() });
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [userData, setUserData] = useState<any>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerChecked, setViewerChecked] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const normalizedUsername = typeof username === 'string' ? username.toLowerCase() : '';
        if (!normalizedUsername) {
          Alert.alert('Error', 'Username not provided');
          setHasAttemptedLoad(true);
          return;
        }

        const cachedProfile = getCachedPublicProfile(normalizedUsername);
        if (cachedProfile) {
          setUserData(cachedProfile);
        }

        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            username,
            display_name,
            city,
            zipcode,
            current_winstreak,
            highest_winstreak,
            current_lossstreak,
            highest_lossstreak,
            wins,
            losses,
            disqualifications,
            created_at,
            last_active_at,
            image_path
          `)
          .eq('username', normalizedUsername)
          .single();

        if (error) throw error;
        setUserData(data);
        setCachedPublicProfile(normalizedUsername, data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Could not load user profile');
      }
      setHasAttemptedLoad(true);
    };

    fetchUserData();
  }, [username]);

  useFocusEffect(
    useCallback(() => {
      const globalAny: any = global;
      if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
        globalAny.setTabBarVisibility(true);
      }
    }, [])
  );

  useEffect(() => {
    const loadViewer = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setViewerId(user?.id || null);
      setViewerChecked(true);
    };
    loadViewer();
  }, []);

  useEffect(() => {
    const globalAny: any = global;
    if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
      globalAny.setTabBarVisibility(true);
    }
  }, []);

  useEffect(() => {
    if (!userData?.id) return;
    loadSubscriberCount(userData.id);
    if (viewerId) {
      loadSubscriptionStatus(userData.id, viewerId);
    }
  }, [userData?.id, viewerId]);

  useEffect(() => {
    if (!viewerChecked || !viewerId) return;
    const globalAny: any = global;
    if (typeof globalAny !== 'undefined' && globalAny.setTabBarVisibility) {
      globalAny.setTabBarVisibility(true);
    }
  }, [viewerChecked, viewerId]);

  const loadSubscriberCount = async (userId: string) => {
    const { count, error } = await supabase
      .from('user_subscriptions')
      .select('subscribed_to_id', { count: 'exact', head: true })
      .eq('subscribed_to_id', userId);
    if (error && error.code === 'PGRST205') {
      return;
    }
    setSubscriberCount(count || 0);
  };

  const loadSubscriptionStatus = async (targetUserId: string, currentUserId: string) => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('subscriber_id')
      .eq('subscriber_id', currentUserId)
      .eq('subscribed_to_id', targetUserId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205') {
        return;
      }
      console.error('Error checking subscription:', error);
      return;
    }
    setIsSubscribed(!!data);
  };

  const handleToggleSubscribe = async () => {
    if (!viewerId) {
      Alert.alert('Login Required', 'Please log in to subscribe.');
      router.push('/(auth)/');
      return;
    }
    if (!userData?.id || viewerId === userData.id) return;

    setSubmitting(true);
    try {
      if (isSubscribed) {
        const { error } = await supabase
          .from('user_subscriptions')
          .delete()
          .eq('subscriber_id', viewerId)
          .eq('subscribed_to_id', userData.id);
        if (error) {
          if (error.code === 'PGRST205') {
            Alert.alert('Unavailable', 'Subscriptions are not set up yet.');
            return;
          }
          throw error;
        }
        setIsSubscribed(false);
        setSubscriberCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({ subscriber_id: viewerId, subscribed_to_id: userData.id });
        if (error) {
          if (error.code === 'PGRST205') {
            Alert.alert('Unavailable', 'Subscriptions are not set up yet.');
            return;
          }
          throw error;
        }
        setIsSubscribed(true);
        setSubscriberCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const userStats = [
    { label: 'Win Streak', value: userData?.current_winstreak || '0' },
    { label: 'Highest Win Streak', value: userData?.highest_winstreak || '0' },
    { label: 'Wins', value: userData?.wins || '0' },
    { label: 'Losses', value: userData?.losses || '0' },
    { label: 'Win Rate', value: userData?.wins !== undefined && userData?.losses !== undefined && (userData.wins + userData.losses) > 0 
      ? `${Math.round((userData.wins / (userData.wins + userData.losses)) * 100)}%` 
      : '0%' },
    { label: 'Disqualifications', value: userData?.disqualifications || '0' },
  ];

  if (!userData && hasAttemptedLoad) {
    return (
      <SafeAreaView style={styles.container}>
        <BackgroundLayer />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Profile not found</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const FALLBACK_AVATAR = require('../assets/logo.png');
  
  // Get avatar URI using the helper function
  const avatarUri = getProfilePicUrl(userData?.image_path);

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundLayer />
      <View style={styles.contentWrapper}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Profile Header */}
          <View style={styles.headerContainer}>
            <View style={styles.avatarContainer}>
              <Image
                source={!avatarUri || avatarError ? FALLBACK_AVATAR : { uri: avatarUri }}
                style={styles.avatar}
                resizeMode="cover"
                onError={() => setAvatarError(true)}
              />
            </View>
            
            <View style={styles.userInfoContainer}>
              <Text style={styles.displayName}>
                {userData?.display_name || 'User'}
              </Text>
              <Text style={styles.username}>
                @{userData?.username || 'username'}
              </Text>
              {(userData?.city || userData?.zipcode) && (
                <Text style={styles.location}>
                  {[userData?.city, userData?.zipcode].filter(Boolean).join(' - ')}
                </Text>
              )}
              <Text style={styles.subscriberCount}>
                {subscriberCount} subscribers
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {userData?.id && userData.id !== viewerId && (
            <View style={styles.actionContainer}>
              <Pressable 
                style={[styles.actionButton, styles.subscribeButton]} 
                onPress={handleToggleSubscribe} 
                disabled={submitting}
              >
                <Text style={styles.actionButtonText}>
                  {submitting ? 'Please wait...' : isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </Text>
              </Pressable>
            </View>
          )}
          
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Stats</Text>
            <View style={styles.statsGrid}>
              {userStats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

        </ScrollView>
        
        {viewerChecked && !viewerId && (
          <View style={styles.authCtaRow}>
            <Pressable style={[styles.actionButton, styles.subscribeButton]} onPress={() => setShowAuthModal(true)}>
              <Text style={styles.actionButtonText}>Sign in to subscribe</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Modal
        visible={showAuthModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.authModalBackdrop}>
          <AuthSection keyboardOffset={0} />
          <Pressable style={styles.authModalDismiss} onPress={() => setShowAuthModal(false)}>
            <Text style={styles.authModalDismissText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DaPaintColors.bg0,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 680, // Limit width on web
    alignSelf: 'center',
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 160, // Extra padding to account for bottom tab bar
    padding: DaPaintSpacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: DaPaintColors.textPrimary,
    ...DaPaintTypography.bodyLarge,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: DaPaintSpacing.xl,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: DaPaintRadius.full,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: DaPaintColors.primaryDeep,
    marginBottom: DaPaintSpacing.md,
    ...DaPaintShadows.medium,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: DaPaintSpacing.md,
  },
  displayName: {
    color: DaPaintColors.textPrimary,
    ...DaPaintTypography.displayMedium,
    marginBottom: DaPaintSpacing.xxs,
  },
  username: {
    color: DaPaintColors.textSecondary,
    ...DaPaintTypography.bodyMedium,
    marginBottom: DaPaintSpacing.xxs,
  },
  location: {
    color: DaPaintColors.textTertiary,
    ...DaPaintTypography.bodySmall,
    marginBottom: DaPaintSpacing.xxs,
  },
  subscriberCount: {
    color: DaPaintColors.textTertiary,
    ...DaPaintTypography.bodySmall,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: DaPaintSpacing.xl,
  },
  actionButton: {
    paddingVertical: DaPaintSpacing.sm,
    paddingHorizontal: DaPaintSpacing.lg,
    borderRadius: DaPaintRadius.sm,
    alignItems: 'center',
    minWidth: 120,
  },
  subscribeButton: {
    backgroundColor: DaPaintColors.primaryDeep,
    borderWidth: 1,
    borderColor: DaPaintColors.primaryDeep,
  },
  actionButtonText: {
    color: '#FFFFFF',
    ...DaPaintTypography.labelMedium,
  },
  authCtaRow: {
    alignItems: 'center',
    marginBottom: DaPaintSpacing.xl,
  },
  authModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  authModalDismiss: {
    alignSelf: 'center',
    marginTop: DaPaintSpacing.sm,
    marginBottom: DaPaintSpacing.lg,
  },
  authModalDismissText: {
    color: DaPaintColors.textPrimary,
    ...DaPaintTypography.bodySmall,
  },
  statsSection: {
    marginBottom: DaPaintSpacing.xl,
  },
  sectionTitle: {
    ...DaPaintTypography.displaySmall,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.md,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: DaPaintSpacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: DaPaintSpacing.md,
    paddingHorizontal: DaPaintSpacing.md,
    borderRadius: DaPaintRadius.md,
    backgroundColor: DaPaintButtons.faq.background,
    borderWidth: 1,
    borderColor: DaPaintButtons.faq.border,
    alignItems: 'center',
  },
  statValue: {
    ...DaPaintTypography.displaySmall,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.xxs,
  },
  statLabel: {
    ...DaPaintTypography.bodySmall,
    color: DaPaintColors.textTertiary,
    textAlign: 'center',
  },
});
