// lib/DaPaintDataManager.ts
// Centralized DaPaint data management with preloading and caching

import { supabase } from './supabase';
import logger from './logger';
import type { DaPaint } from './api/dapaints';
import { userDataManager } from './UserDataManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enhanced cache with persistence and smarter invalidation
class DaPaintDataManager {
  private normalizeZip(zip?: string | null): string | null {
    return zip ? zip.trim().toUpperCase() : null;
  }

  private feedData: DaPaint[] = [];
  private activeDaPaint: DaPaint | null = null;
  private lastFeedFetchTime: number = 0;
  private lastActiveFetchTime: number = 0;
  // Increase cache expiry from 2 minutes to 5 minutes to reduce API calls
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes cache
  private feedLoadingPromise: Promise<DaPaint[]> | null = null;
  private activeLoadingPromise: Promise<DaPaint | null> | null = null;
  private feedStorageKey: string = 'feedDataCache';
  private activeStorageKey: string = 'activeDaPaintCache';
  private storageLoadPromise: Promise<void> | null = null;

  constructor() {
    // Try to load from AsyncStorage on initialization
    this.storageLoadPromise = Promise.all([
      this.loadFeedFromStorage(),
      this.loadActiveFromStorage(),
    ]).then(() => undefined);
  }

  /**
   * Get feed DaPaints with caching
   */
  async getFeedDaPaints(
    userWinstreak: number,
    userZipcode?: string,
    userCity?: string,
    limit: number = 10
  ): Promise<DaPaint[]> {
    if (this.storageLoadPromise) {
      await this.storageLoadPromise;
    }
    const now = Date.now();
    
    // Return cached data if still valid
    if (
      this.feedData.length > 0 &&
      (now - this.lastFeedFetchTime) < this.cacheExpiry
    ) {
      logger.debug('Returning cached feed DaPaints');
      return this.feedData.slice(0, limit);
    }

    // If already loading, return the existing promise
    if (this.feedLoadingPromise) {
      logger.debug('Feed data already loading, returning existing promise');
      return this.feedLoadingPromise.then(data => data.slice(0, limit));
    }

    // Start loading and store the promise
    this.feedLoadingPromise = this.fetchFeedDaPaints(userWinstreak, userZipcode, userCity, limit * 2)
      .then(data => {
        this.feedData = data;
        this.lastFeedFetchTime = Date.now();
        this.feedLoadingPromise = null;
        // Save to storage
        this.saveFeedToStorage(userWinstreak, userZipcode, userCity);
        return data;
      })
      .catch(error => {
        logger.error('Error fetching feed DaPaints:', error);
        this.feedLoadingPromise = null;
        // Try to return cached data if available
        if (this.feedData.length > 0) {
          logger.debug('Returning stale cached feed data due to error');
          return this.feedData.slice(0, limit);
        }
        return [];
      });

    return this.feedLoadingPromise;
  }

  /**
   * Fetch feed DaPaints from Supabase
   */
  private async fetchFeedDaPaints(
    userWinstreak: number,
    userZipcode?: string,
    userCity?: string,
    limit: number = 20
  ): Promise<DaPaint[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      logger.debug('Feed Query Debug Info:');
      const normalizedZip = this.normalizeZip(userZipcode);
      logger.debug('User ID:', user.id);
      logger.debug('User Winstreak:', userWinstreak);
      logger.debug('User Zipcode:', normalizedZip || 'NOT PROVIDED (Lucky Mode)');
      logger.debug('User City:', userCity || 'NOT PROVIDED');

      // Base query - always filter by winstreak and exclude user's own DaPaints
      let query = supabase
        .from('dapaints')
        .select(`
          *,
          host:users!dapaints_host_id_fkey(zipcode, city)
        `)
        .eq('status', 'scheduled')
        .eq('required_winstreak', userWinstreak)
        .is('foe_id', null) // Only show DaPaints that are still joinable
        .neq('host_id', user.id);

      logger.debug('Base query filters:');
      logger.debug('status = scheduled');
      logger.debug('required_winstreak =', userWinstreak);
      logger.debug('foe_id = null (joinable)');
      logger.debug('host_id !=', user.id);

      // Option B: Filter by zipcode (DaPaint.zipcode OR Host.zipcode matches User.zipcode)
      if (normalizedZip) {
        logger.debug('📍 Filtering by ZIPCODE (Option B):');
        logger.debug('Looking for DaPaints where:');
        logger.debug('- DaPaint.zipcode =', normalizedZip, 'OR');
        logger.debug('- Host.zipcode =', normalizedZip);
        
        // This filter can't be done directly in Supabase query
        // We need to fetch all and filter in JavaScript
        query = query.order('created_at', { ascending: false }).limit(limit * 3); // Fetch more to filter
      } else {
        // Option 1: Lucky Mode - no location filter
        logger.debug('🎲 LUCKY MODE: Showing DaPaints from ALL locations');
        query = query.order('created_at', { ascending: false }).limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter results in JavaScript if zipcode filtering is needed
      let filteredData = data || [];
      
      if (normalizedZip && data) {
        filteredData = data.filter((dapaint: any) => {
          const dapaintZipcode = this.normalizeZip(dapaint.zipcode);
          const hostZip = this.normalizeZip(dapaint.host?.zipcode);
          
          // Match if EITHER DaPaint zipcode OR Host zipcode matches user's zipcode
          const matches = dapaintZipcode === normalizedZip || hostZip === normalizedZip;
          
          if (matches) {
            logger.debug(`✅ Match: "${dapaint.dapaint}" (DaPaint: ${dapaintZipcode}, Host: ${hostZip})`);
          }
          
          return matches;
        }).slice(0, limit); // Limit to requested number
      }
      
      logger.debug('✅ Results found:', filteredData.length);
      if (filteredData && filteredData.length > 0) {
        logger.debug('📊 DaPaints returned:');
        filteredData.forEach((dapaint: any) => {
          const hostZip = this.normalizeZip(dapaint.host?.zipcode) || 'unknown';
          logger.debug(`- ${dapaint.dapaint} (DaPaint: ${dapaint.city}, ${dapaint.zipcode} | Host: ${hostZip}) [ID: ${dapaint.id}]`);
        });
      } else {
        logger.debug('⚠️ No DaPaints found with these filters');
      }

      // Remove the joined host data before returning (we only needed it for filtering)
      return filteredData.map((dapaint: any) => {
        const { host, ...rest } = dapaint;
        return rest as DaPaint;
      });
    } catch (error) {
      logger.error('❌ Error fetching feed DaPaints:', error);
      return [];
    }
  }

  /**
   * Get user's active DaPaint with caching
   */
  async getActiveDaPaint(): Promise<DaPaint | null> {
    if (this.storageLoadPromise) {
      await this.storageLoadPromise;
    }
    const now = Date.now();
    
    // Return cached data if still valid
    if (
      this.activeDaPaint &&
      (now - this.lastActiveFetchTime) < this.cacheExpiry
    ) {
      logger.debug('Returning cached active DaPaint');
      return this.activeDaPaint;
    }

    // If already loading, return the existing promise
    if (this.activeLoadingPromise) {
      logger.debug('Active DaPaint already loading, returning existing promise');
      return this.activeLoadingPromise;
    }

    // Start loading and store the promise
    this.activeLoadingPromise = this.fetchActiveDaPaint()
      .then(data => {
        this.activeDaPaint = data;
        this.lastActiveFetchTime = Date.now();
        this.activeLoadingPromise = null;
        // Save to storage
        this.saveActiveToStorage();
        return data;
      })
      .catch(error => {
        logger.error('Error fetching active DaPaint:', error);
        this.activeLoadingPromise = null;
        // Try to return cached data if available
        if (this.activeDaPaint) {
          logger.debug('Returning stale cached active DaPaint due to error');
          return this.activeDaPaint;
        }
        return null;
      });

    return this.activeLoadingPromise;
  }

  /**
   * Fetch user's active DaPaint from Supabase
   */
  private async fetchActiveDaPaint(): Promise<DaPaint | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if hosting - get the most recently created one
      const { data: hostedDaPaints, error: hostedError } = await supabase
        .from('dapaints')
        .select('*')
        .eq('host_id', user.id)
        .in('status', ['scheduled', 'pending_balance', 'live'])
        .order('created_at', { ascending: false });

      if (hostedError) throw hostedError;
      
      // Log data integrity issue if found
      if (hostedDaPaints && hostedDaPaints.length > 1) {
        logger.warn(`Data Integrity Violation: User ${user.id} is hosting ${hostedDaPaints.length} active DaPaints. This violates the exclusivity constraint.`);
      }
      
      if (hostedDaPaints && hostedDaPaints.length > 0) return hostedDaPaints[0] as DaPaint;

      // Check if foe in 1v1 - get the most recently created one
      const { data: foeDaPaints, error: foeError } = await supabase
        .from('dapaints')
        .select('*')
        .eq('foe_id', user.id)
        .in('status', ['scheduled', 'pending_balance', 'live'])
        .order('created_at', { ascending: false });

      if (foeError) throw foeError;
      
      // Log data integrity issue if found
      if (foeDaPaints && foeDaPaints.length > 1) {
        logger.warn(`Data Integrity Violation: User ${user.id} is a foe in ${foeDaPaints.length} active DaPaints. This violates the exclusivity constraint.`);
      }
      
      if (foeDaPaints && foeDaPaints.length > 0) return foeDaPaints[0] as DaPaint;

      // Check if in team DaPaint - get the most recently joined one
      const { data: participations, error: participationError } = await supabase
        .from('dapaint_participants')
        .select('dapaint_id')
        .eq('user_id', user.id);

      if (participationError) throw participationError;
      
      // Log data integrity issue if found
      if (participations && participations.length > 1) {
        logger.warn(`Data Integrity Violation: User ${user.id} is participating in ${participations.length} team DaPaints. This violates the exclusivity constraint.`);
      }
      
      if (participations.length === 0 || !participations[0]) return null;

      const { data: teamDaPaints, error: teamError } = await supabase
        .from('dapaints')
        .select('*')
        .eq('id', participations[0].dapaint_id)
        .in('status', ['scheduled', 'pending_balance', 'live']);

      if (teamError) throw teamError;
      
      // Log data integrity issue if found
      if (teamDaPaints && teamDaPaints.length > 1) {
        logger.warn(`Data Integrity Violation: Found ${teamDaPaints.length} team DaPaints for participation ID ${participations[0].dapaint_id}. This indicates a data issue.`);
      }
      
      if (teamDaPaints && teamDaPaints.length > 0) return teamDaPaints[0] as DaPaint;
      
      return null;
    } catch (error) {
      logger.error('Error fetching active DaPaint:', error);
      return null;
    }
  }

  /**
   * Preload feed data in the background
   */
  async preloadFeedData(): Promise<void> {
    logger.debug('Preloading feed data...');
    
    // Get user data first
    const userData = await userDataManager.getUserData();
    if (!userData) {
      logger.debug('No user data available for preloading feed');
      return;
    }
    
    // Start loading feed data but don't wait for it
    this.getFeedDaPaints(
      userData.current_winstreak,
      userData.zipcode,
      userData.city,
      20
    ).catch(error => {
      logger.error('Error preloading feed data:', error);
    });
  }

  /**
   * Preload active DaPaint data in the background
   */
  async preloadActiveDaPaint(): Promise<void> {
    logger.debug('Preloading active DaPaint data...');
    
    // Start loading but don't wait for it
    this.getActiveDaPaint().catch(error => {
      logger.error('Error preloading active DaPaint:', error);
    });
  }

  /**
   * Clear cached feed data
   */
  clearFeedCache(): void {
    this.feedData = [];
    this.lastFeedFetchTime = 0;
    this.feedLoadingPromise = null;
    this.removeFromStorage(this.feedStorageKey);
  }

  /**
   * Clear cached active DaPaint data
   */
  clearActiveCache(): void {
    this.activeDaPaint = null;
    this.lastActiveFetchTime = 0;
    this.activeLoadingPromise = null;
    this.removeFromStorage(this.activeStorageKey);
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    this.clearFeedCache();
    this.clearActiveCache();
  }

  /**
   * Save feed data to AsyncStorage for persistence
   */
  private saveFeedToStorage(userWinstreak: number, userZipcode?: string, userCity?: string): void {
    try {
      if (this.feedData.length > 0) {
        const cacheData = {
          data: this.feedData,
          timestamp: this.lastFeedFetchTime,
          params: { userWinstreak, userZipcode, userCity }
        };
        AsyncStorage.setItem(this.feedStorageKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      logger.debug('Could not save feed data to storage:', error);
    }
  }

  /**
   * Save active DaPaint to AsyncStorage for persistence
   */
  private saveActiveToStorage(): void {
    try {
      if (this.activeDaPaint) {
        const cacheData = {
          data: this.activeDaPaint,
          timestamp: this.lastActiveFetchTime
        };
        AsyncStorage.setItem(this.activeStorageKey, JSON.stringify(cacheData));
      }
    } catch (error) {
      logger.debug('Could not save active DaPaint to storage:', error);
    }
  }

  /**
   * Load feed data from AsyncStorage
   */
  private async loadFeedFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.feedStorageKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if ((now - cacheData.timestamp) < this.cacheExpiry) {
          this.feedData = cacheData.data;
          this.lastFeedFetchTime = cacheData.timestamp;
          logger.debug('Loaded feed data from storage cache');
        }
      }
    } catch (error) {
      logger.debug('Could not load feed data from storage:', error);
    }
  }

  /**
   * Load active DaPaint from AsyncStorage
   */
  private async loadActiveFromStorage(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.activeStorageKey);
      if (cached) {
        const cacheData = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if ((now - cacheData.timestamp) < this.cacheExpiry) {
          this.activeDaPaint = cacheData.data;
          this.lastActiveFetchTime = cacheData.timestamp;
          logger.debug('Loaded active DaPaint from storage cache');
        }
      }
    } catch (error) {
      logger.debug('Could not load active DaPaint from storage:', error);
    }
  }

  /**
   * Remove item from AsyncStorage
   */
  private removeFromStorage(key: string): void {
    try {
      AsyncStorage.removeItem(key);
    } catch (error) {
      logger.debug(`Could not remove ${key} from storage:`, error);
    }
  }
}

// Export singleton instance
export const daPaintDataManager = new DaPaintDataManager();

// Export the class for testing purposes
export default DaPaintDataManager;

