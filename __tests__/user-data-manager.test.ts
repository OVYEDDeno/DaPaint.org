// __tests__/user-data-manager.test.ts
import { userDataManager } from '../lib/UserDataManager';

// Mock the supabase client properly
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
    })),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSupabase = require('../lib/supabase').supabase;

describe('UserDataManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any cached data
    userDataManager.clearCache();
  });

  describe('preloadUserData', () => {
    it('should preload user data successfully', async () => {
      const mockUser = { id: 'user-id-123' };
      const mockUserData = {
        id: 'user-id-123',
        username: 'testuser',
        display_name: 'Test User',
        current_winstreak: 5,
        // ... other properties
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockUserData,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      const result = await userDataManager.preloadUserData();

      expect(result).toBeUndefined();
      // Verify internal cache was set by accessing private property
      expect((userDataManager as any).userData).toEqual(mockUserData);
    });

    it('should return null when no authenticated user', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await userDataManager.preloadUserData();

      expect(result).toBeUndefined();
      // Verify internal cache was set by accessing private property
      expect((userDataManager as any).userData).toBeNull();
    });

    it('should return null when user data not found in database', async () => {
      const mockUser = { id: 'user-id-123' };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' },
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      const result = await userDataManager.preloadUserData();

      expect(result).toBeUndefined();
      // Verify internal cache was set by accessing private property
      expect((userDataManager as any).userData).toBeNull();
    });
  });

  describe('getUserData', () => {
    it('should return cached data when available and not forcing refresh', async () => {
      const cachedData = { id: 'user-id-123', username: 'cacheduser' };

      // Manually set cached data
      (userDataManager as any).userData = cachedData;
      (userDataManager as any).lastFetchTime = Date.now();

      const result = await userDataManager.getUserData(false); // Don't force refresh

      expect(result).toEqual(cachedData);
      // Should not call supabase if using cached data
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when forcing refresh', async () => {
      const mockUser = { id: 'user-id-123' };
      const mockUserData = {
        id: 'user-id-123',
        username: 'testuser',
        display_name: 'Test User',
        current_winstreak: 5,
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: mockUserData,
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      const result = await userDataManager.getUserData(true); // Force refresh

      expect(result).toEqual(mockUserData);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should return null when not authenticated', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      const result = await userDataManager.getUserData(true);

      expect(result).toBeNull();
    });
  });

  describe('updateCachedUserData', () => {
    it('should update cached user data', () => {
      const newData = {
        id: 'user-id-123',
        username: 'updateduser',
        current_winstreak: 10,
      };

      (userDataManager as any).userData = {
        id: 'user-id-123',
        username: 'initialuser',
      };
      userDataManager.updateCachedUserData(newData);

      // Verify internal cache was updated by accessing private property
      expect((userDataManager as any).userData).toEqual(newData);
    });

    it('should merge with existing data', () => {
      const initialData = {
        id: 'user-id-123',
        username: 'initialuser',
        current_winstreak: 5,
      };
      const updateData = {
        current_winstreak: 10,
        display_name: 'Updated Name',
      };
      const expected = {
        id: 'user-id-123',
        username: 'initialuser',
        current_winstreak: 10,
        display_name: 'Updated Name',
      };

      // Manually set initial cached data
      (userDataManager as any).userData = initialData;

      userDataManager.updateCachedUserData(updateData);

      // Verify internal cache was updated by accessing private property
      expect((userDataManager as any).userData).toEqual(expected);
    });
  });

  describe('clearCache', () => {
    it('should clear cached user data', () => {
      // Manually set cached data
      (userDataManager as any).userData = {
        id: 'user-id-123',
        username: 'testuser',
      };

      userDataManager.clearCache();

      // Verify internal cache was cleared by accessing private property
      expect((userDataManager as any).userData).toBeNull();
    });
  });
});
