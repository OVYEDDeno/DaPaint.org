// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Memory storage for SSR and fallback
const memoryStorage: Record<string, string> = {};

// Storage adapter that avoids early imports
const storageAdapter = {
  getItem: async (key: string) => {
    // Handle SSR
    if (typeof window === 'undefined') {
      return memoryStorage[key] || null;
    }

    // Handle web platform
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch {
        return memoryStorage[key] || null;
      }
    }

    // Handle native platforms - lazy load AsyncStorage
    try {
      const module = await import('@react-native-async-storage/async-storage');
      const AsyncStorage = module.default;
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStorage[key] || null;
    }
  },

  setItem: async (key: string, value: string) => {
    // Handle SSR
    if (typeof window === 'undefined') {
      memoryStorage[key] = value;
      return;
    }

    // Handle web platform
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        memoryStorage[key] = value;
        return;
      }
    }

    // Handle native platforms - lazy load AsyncStorage
    try {
      const module = await import('@react-native-async-storage/async-storage');
      const AsyncStorage = module.default;
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = value;
    }
  },

  removeItem: async (key: string) => {
    // Handle SSR
    if (typeof window === 'undefined') {
      delete memoryStorage[key];
      return;
    }

    // Handle web platform
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        delete memoryStorage[key];
        return;
      }
    }

    // Handle native platforms - lazy load AsyncStorage
    try {
      const module = await import('@react-native-async-storage/async-storage');
      const AsyncStorage = module.default;
      await AsyncStorage.removeItem(key);
    } catch {
      delete memoryStorage[key];
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
