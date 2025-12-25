// __tests__/dapaints.test.ts
import { createDaPaint, joinDaPaint, getAvailableDaPaints, getActiveDaPaint } from '../lib/api/dapaints';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn().mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  },
}));

const mockSupabase = require('../lib/supabase').supabase;

describe('DaPaint API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockSupabase.from as jest.Mock).mockImplementation((_table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createDaPaint', () => {
    it('should create a new DaPaint successfully', async () => {
      const mockUser = { id: 'user-id-123' };
      const mockUserData = { display_name: 'Test User', current_winstreak: 5 };
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      const mockParams = {
        dapaint: 'Test DaPaint',
        description: 'Test description',
        how_winner_is_determined: 'Majority vote',
        rules_of_dapaint: 'Play fair',
        location: 'Test Location',
        city: 'Test City',
        zipcode: '12345',
        starts_at: '2023-12-25T10:00:00Z',
        ticket_price: 10,
        max_participants: 2,
        dapaint_type: '1v1' as const,
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const usersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserData,
          error: null,
        }),
      };

      const dapaintsQuery = { insert: insertMock };

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') return usersQuery;
        if (table === 'dapaints') return dapaintsQuery;
        return {};
      });

      await createDaPaint(mockParams);

      expect(mockSupabase.from).toHaveBeenCalledWith('dapaints');
      expect(insertMock).toHaveBeenCalledWith({
        host_id: 'user-id-123',
        host_display_name: 'Test User',
        foe_id: null,
        foe_display_name: null,
        dapaint: 'Test DaPaint',
        description: 'Test description',
        how_winner_is_determined: 'Majority vote',
        rules_of_dapaint: 'Play fair',
        location: 'Test Location',
        city: 'Test City',
        zipcode: '12345',
        starts_at: '2023-12-25T10:00:00Z',
        ticket_price: '10',
        dapaint_type: '1v1',
        max_participants: 2,
        required_winstreak: 5,
        status: 'scheduled',
        host_claimed_winner_id: null,
        foe_claimed_winner_id: null,
      });
    });

    it('should throw error when not authenticated', async () => {
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await expect(createDaPaint({
        dapaint: 'Test DaPaint',
        description: 'Test description',
        how_winner_is_determined: 'Majority vote',
        rules_of_dapaint: 'Play fair',
        location: 'Test Location',
        city: 'Test City',
        zipcode: '12345',
        starts_at: '2023-12-25T10:00:00Z',
        ticket_price: 10,
        max_participants: 2,
        dapaint_type: '1v1' as const,
      })).rejects.toThrow('Not authenticated');
    });
  });

  describe('joinDaPaint', () => {
    it('should successfully join a DaPaint', async () => {
      const mockUser = { id: 'user-id-123' };
      const mockRpcResult = { success: true, message: 'Successfully joined' };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      (mockSupabase.rpc as jest.Mock).mockResolvedValue({
        data: mockRpcResult,
        error: null,
      });

      const result = await joinDaPaint('dapaint-id-123', 'user-id-123', 'Test User');

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('join_dapaint_safe', {
        p_dapaint_id: 'dapaint-id-123',
        p_user_id: 'user-id-123',
        p_display_name: 'Test User',
      });
    });

    it('should return error when user already in active DaPaint', async () => {
      const mockUser = { id: 'user-id-123' };
      const mockActiveDaPaint = {
        id: 'existing-dapaint-id',
        dapaint: 'Existing DaPaint',
        dapaint_type: '1v1',
        host_id: 'user-id-123',
        foe_id: null,
        starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      };

      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const dapaintsQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockActiveDaPaint],
          error: null,
        }),
      };
      const participantsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'dapaints') return dapaintsQuery;
        if (table === 'dapaint_participants') return participantsQuery;
        return {};
      });

      const result = await joinDaPaint('new-dapaint-id', 'user-id-123', 'Test User');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Existing DaPaint');
    });
  });

  describe('getAvailableDaPaints', () => {
    it('should return available DaPaints for user', async () => {
      const mockUserData = { current_winstreak: 5 };
      const mockDaPaints = [
        {
          id: 'dapaint-1',
          host_id: 'other-user-id',
          foe_id: null,
          status: 'scheduled',
          required_winstreak: 5,
          dapaint_type: '1v1',
          // ... other properties
        }
      ];

      const usersQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserData,
          error: null,
        }),
      };
      const dapaintsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockDaPaints,
          error: null,
        }),
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'users') return usersQuery;
        if (table === 'dapaints') return dapaintsQuery;
        return {};
      });

      const result = await getAvailableDaPaints('user-id-123');

      expect(result).toEqual(mockDaPaints);
      expect(usersQuery.select).toHaveBeenCalledWith('current_winstreak');
      expect(usersQuery.eq).toHaveBeenCalledWith('id', 'user-id-123');
    });
  });

  describe('getActiveDaPaint', () => {
    it('should return user\'s active DaPaint when exists', async () => {
      const mockDaPaint = {
        id: 'active-dapaint-id',
        host_id: 'user-id-123',
        status: 'scheduled',
        dapaint: 'Active DaPaint',
        // ... other properties
      };

      const dapaintsQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockDaPaint],
          error: null,
        }),
      };
      const participantsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'dapaints') return dapaintsQuery;
        if (table === 'dapaint_participants') return participantsQuery;
        return {};
      });

      const result = await getActiveDaPaint('user-id-123');

      expect(result).toEqual(mockDaPaint);
    });

    it('should return null when no active DaPaint', async () => {
      const dapaintsQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      const participantsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'dapaints') return dapaintsQuery;
        if (table === 'dapaint_participants') return participantsQuery;
        return {};
      });

      const result = await getActiveDaPaint('user-id-123');

      expect(result).toBeNull();
    });
  });
});
