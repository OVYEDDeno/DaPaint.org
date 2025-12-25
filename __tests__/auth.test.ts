// __tests__/auth.test.ts
import { signUp, signIn, signOut, getSession, isAuthenticated } from '../lib/api/auth';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  },
}));

const mockSupabase = require('../lib/supabase').supabase;

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const mockAuthData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      };
      
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: mockAuthData,
        error: null,
      });
      
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }), // No existing user
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const result = await signUp('test@example.com', 'password123', 'testuser');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-id');
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            display_name: 'testuser',
          },
        },
      });
    });

    it('should return error when auth signup fails', async () => {
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists', status: 422 },
      });

      const result = await signUp('test@example.com', 'password123', 'testuser');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Email already exists');
    });

    it('should return error when database user creation fails', async () => {
      const mockAuthData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      };
      
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: mockAuthData,
        error: null,
      });
      
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }), // No existing user
        insert: jest.fn().mockResolvedValue({ error: { message: 'DB Error', code: '23505' } }),
      });

      const result = await signUp('test@example.com', 'password123', 'testuser');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Failed to create user profile');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in an existing user', async () => {
      const mockAuthData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      };
      
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: mockAuthData,
        error: null,
      });
      
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'test-user-id' } }),
      });

      const result = await signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-id');
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return user-friendly error for invalid credentials', async () => {
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const result = await signIn('test@example.com', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Incorrect email or password');
    });

    it('should create missing user profile if not found in database', async () => {
      const mockAuthData = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { display_name: 'Test User' },
        },
      };
      
      (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: mockAuthData,
        error: null,
      });
      
      (mockSupabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: 'User not found' }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({ error: null }),
        });

      const result = await signIn('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('test-user-id');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await signOut();

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should return error when sign out fails', async () => {
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await signOut();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Sign out failed');
    });
  });

  describe('getSession', () => {
    it('should return session when available', async () => {
      const mockSession = { user: { id: 'test-user-id' } };
      
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await getSession();

      expect(result).toBe(mockSession);
    });

    it('should return null when no session', async () => {
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await getSession();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when session exists', async () => {
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      });

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no session', async () => {
      (mockSupabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });
});
