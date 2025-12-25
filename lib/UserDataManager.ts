// lib/UserDataManager.ts
// Centralized user data management with preloading and caching

import { supabase } from './supabase';
import logger from './logger';
import type { UserProfile } from './api/users';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced cache with persistence
class UserDataManager {
  private userData: UserProfile | null = null;
  private loadingPromise: Promise<UserProfile | null> | null = null;
  private lastFetchTime: number = 0;
  // Increase cache expiry from 5 minutes to 10 minutes to reduce API calls
  private cacheExpiry: number = 10 * 60 * 1000; // 10 minutes cache
  private storageKey: string = 'userDataCache';
  private storageLoadPromise: Promise<void> | null = null;

  constructor() {
    // Try to load from AsyncStorage on initialization
    this.storageLoadPromise = this.loadFromStorage();
  }

  /**
   * Get current user data with caching
   */
  async getUserData(forceRefresh: boolean = false): Promise<UserProfile | null> {
    if (this.storageLoadPromise) {
      await this.storageLoadPromise;
    }
    const now = Date.now();

    // Ensure we only serve cached data for an active session
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (this.userData) {
          logger.debug('No active session. Clearing cached user data.');
          this.clearCache();
        }
        return null;
      }
    } catch (error) {
      logger.error('Error checking session before returning user data:', error);
      return null;
    }
    
    // Return cached data if still valid and not forcing refresh
    if (
      this.userData && 
      !forceRefresh && 
      (now - this.lastFetchTime) < this.cacheExpiry
    ) {
      logger.debug('Returning cached user data');
      return this.userData;
    }

    // If already loading, return the existing promise
    if (this.loadingPromise) {
      logger.debug('User data already loading, returning existing promise');
      return this.loadingPromise;
    }

    // Start loading and store the promise
    this.loadingPromise = this.fetchUserData()
      .then(data => {
        this.userData = data;
        this.lastFetchTime = Date.now();
        this.loadingPromise = null;
        // Save to storage
        this.saveToStorage();
        return data;
      })
      .catch(error => {
        logger.error('Error fetching user data:', error);
        this.loadingPromise = null;
        return null;
      });

    return this.loadingPromise;
  }

  /**
   * Fetch user data from Supabase
   */
  private async fetchUserData(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      logger.debug('Fetching user data from Supabase');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // If user is authenticated but doesn't have a profile, return null
        if (error.code === 'PGRST116') {
          logger.debug('User authenticated but no profile found');
          return null;
        }
        throw error;
      }
      
      logger.debug('User data fetched successfully');
      return data as UserProfile;
    } catch (error) {
      logger.error('Error fetching user data:', error);
      // Try to return cached data if available
      if (this.userData) {
        logger.debug('Returning stale cached data due to error');
        return this.userData;
      }
      return null;
    }
  }

  /**
   * Preload user data in the background
   */
  async preloadUserData(): Promise<void> {
    logger.debug('Preloading user data...');
    // Start loading but don't wait for it
    try {
      await this.getUserData();
    } catch (error) {
      logger.error('Error preloading user data:', error);
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.userData = null;
    this.lastFetchTime = 0;
    this.loadingPromise = null;
    this.removeFromStorage();
  }

  /**
   * Clear user data (alias for clearCache)
   * Used when signing out
   */
  clearUserData(): void {
    this.clearCache();
  }

  /**
   * Update user data in cache
   */
  updateCachedUserData(updates: Partial<UserProfile>): void {
    if (this.userData) {
      this.userData = { ...this.userData, ...updates };
      this.lastFetchTime = Date.now(); // Update timestamp
      this.saveToStorage();
    }
  }

  /**
   * Save to AsyncStorage for persistence
   */
  private saveToStorage(): void {
    try {
      if (this.userData) {
        const cacheData = {
          data: this.userData,
          timestamp: this.lastFetchTime
        };
        AsyncStorage.setItem(this.storageKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      logger.debug('Could not save user data to storage:', error);
    }
  }

  /**
   * Load from AsyncStorage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.storageKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if ((now - cacheData.timestamp) < this.cacheExpiry) {
          this.userData = cacheData.data;
          this.lastFetchTime = cacheData.timestamp;
          logger.debug('Loaded user data from storage cache');
        }
      }
    } catch (error) {
      logger.debug('Could not load user data from storage:', error);
    }
  }

  /**
   * Remove from AsyncStorage
   */
  private removeFromStorage(): void {
    try {
      AsyncStorage.removeItem(this.storageKey);
    } catch (error) {
      logger.debug('Could not remove user data from storage:', error);
    }
  }
}

// Export singleton instance
export const userDataManager = new UserDataManager();

// Export the class for testing purposes
export default UserDataManager;
