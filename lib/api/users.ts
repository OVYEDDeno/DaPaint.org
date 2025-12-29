// lib/api/users.ts
// User profile and stats-related API functions

import logger from '../logger';
import { supabase } from '../supabase';
import { userDataManager } from '../UserDataManager';

/**
 * User profile type (full profile - private data)
 */
export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  email: string;
  phone?: string;
  city?: string;
  zipcode?: string;
  birthday?: string;
  gender?: string;
  how_did_you_hear?: string;
  current_winstreak: number;
  highest_winstreak: number;
  current_lossstreak: number;
  highest_lossstreak: number;
  wins: number;
  losses: number;
  disqualifications: number;
  dapaint_10x_unlocked: boolean;
  dapaint_ads_unlocked: boolean;
  times_10x_unlocked: number;
  created_at: string;
  last_active_at: string;
  is_active: boolean;
  test_group: string;
  test_group_assigned_at: string;
  unlocked_features: any[];
}

/**
 * Public profile type (what others can see)
 */
export interface PublicProfile {
  id: string;
  username: string;
  display_name: string;
  city?: string;
  zipcode?: string;
  gender?: string;
  current_winstreak: number;
  highest_winstreak: number;
  current_lossstreak: number;
  highest_lossstreak: number;
  wins: number;
  losses: number;
  disqualifications: number;
  created_at: string;
  last_active_at: string;
  is_active: boolean;
}

/**
 * Get current user's full profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Use the user data manager for caching
    const userData = await userDataManager.getUserData();
    return userData;
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Get a public profile by username
 */
export async function getPublicProfile(
  username: string
): Promise<PublicProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error) {
      logger.error('Error fetching public profile:', error);
      return null;
    }

    return data as PublicProfile;
  } catch (error) {
    logger.error('Error fetching public profile:', error);
    return null;
  }
} /**
 * Update current user's profile
 */
export async function updateUserProfile(updates: Partial<UserProfile>) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Update cache
    userDataManager.updateCachedUserData(updates);

    return data as UserProfile;
  } catch (error) {
    logger.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Update last active timestamp
 */
export async function updateLastActive() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch (error) {
    logger.error('Error updating last active:', error);
  }
}

/**
 * Record a win for the current user
 */
export async function recordWin() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Get current stats
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error('Profile not found');

    const updates = {
      wins: profile.wins + 1,
      current_winstreak: profile.current_winstreak + 1,
      highest_winstreak: Math.max(
        profile.highest_winstreak,
        profile.current_winstreak + 1
      ),
      current_lossstreak: 0, // Reset loss streak
      last_active_at: new Date().toISOString(),
    };

    return await updateUserProfile(updates);
  } catch (error) {
    logger.error('Error recording win:', error);
    throw error;
  }
}

/**
 * Record a loss for the current user
 */
export async function recordLoss() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Get current stats
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error('Profile not found');

    const newLossStreak = profile.current_lossstreak + 1;

    const updates = {
      losses: profile.losses + 1,
      current_lossstreak: newLossStreak,
      highest_lossstreak: Math.max(profile.highest_lossstreak, newLossStreak),
      current_winstreak: 0, // Reset win streak
      last_active_at: new Date().toISOString(),
      // Auto-unlock 10x if lossstreak >= 8
      dapaint_10x_unlocked:
        newLossStreak >= 8 ? true : profile.dapaint_10x_unlocked,
    };

    return await updateUserProfile(updates);
  } catch (error) {
    logger.error('Error recording loss:', error);
    throw error;
  }
}

/**
 * Unlock DaPaint 10x feature
 */
export async function unlockDaPaint10x() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) throw new Error('Profile not found');

    return await updateUserProfile({
      dapaint_10x_unlocked: true,
      times_10x_unlocked: profile.times_10x_unlocked + 1,
    });
  } catch (error) {
    logger.error('Error unlocking DaPaint 10x:', error);
    throw error;
  }
}

/**
 * Unlock DaPaint Ads feature (after watching ad)
 */
export async function unlockDaPaintAds() {
  try {
    return await updateUserProfile({
      dapaint_ads_unlocked: true,
    });
  } catch (error) {
    logger.error('Error unlocking DaPaint Ads:', error);
    throw error;
  }
}

/**
 * Get top users by win streak (leaderboard)
 */
export async function getTopWinStreaks(
  limit: number = 10
): Promise<PublicProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('current_winstreak', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data as PublicProfile[];
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    return [];
  }
} /**
 * Get top users by total wins
 */
export async function getTopWins(limit: number = 10): Promise<PublicProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('wins', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data as PublicProfile[];
  } catch (error) {
    logger.error('Error fetching top wins:', error);
    return [];
  }
}
/**
 * Search users by username or display name
 */
export async function searchUsers(
  query: string,
  limit: number = 10
): Promise<PublicProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(limit);

    if (error) throw error;

    return data as PublicProfile[];
  } catch (error) {
    logger.error('Error searching users:', error);
    return [];
  }
}
