// lib/api/auth.ts - Fixed with username parameter
import logger from '../logger';
import { supabase } from '../supabase';

export type AuthError = {
  message: string;
  code?: string | undefined;
  details?: string;
};

/**
 * Sign up a new user
 * Creates ONLY the auth user - database profile must be created separately
 * This is called from the signup form which collects all required data first
 */
export async function signUp(
  email: string,
  password: string,
  username: string // Username for auth metadata only
): Promise<{ success: boolean; error?: AuthError; userId?: string }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    logger.debug('Starting signup:', {
      email: normalizedEmail,
      username: normalizedUsername,
    });

    // Validate username format (must match DB constraint: lowercase alphanumeric only)
    if (!/^[a-z0-9]+$/.test(normalizedUsername)) {
      return {
        success: false,
        error: {
          message: 'Username can only contain lowercase letters and numbers',
          code: 'INVALID_USERNAME',
        },
      };
    }

    // Check if username already exists BEFORE creating auth user
    const { data: existingUsername } = await supabase
      .from('users')
      .select('username')
      .eq('username', normalizedUsername)
      .single();

    if (existingUsername) {
      return {
        success: false,
        error: {
          message: 'This username is already taken',
          code: 'USERNAME_EXISTS',
        },
      };
    }

    // Create auth user with username in metadata
    // NOTE: Database user profile will be created by signup.tsx after collecting all required fields
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: normalizedUsername,
          display_name: normalizedUsername,
        },
      },
    });

    if (authError) {
      logger.error('Auth signup error:', authError);
      return {
        success: false,
        error: {
          message: authError.message,
          code: authError.status?.toString() || undefined,
          details: 'Failed to create authentication account',
        },
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: {
          message: 'No user returned from signup',
          details: 'Authentication succeeded but no user data returned',
        },
      };
    }

    // Check if we have a session (should be auto-created by signUp)
    if (!authData.session) {
      logger.warn(
        'No session returned from signUp - user may need to verify email'
      );
    } else {
      logger.debug('Session created with auth user:', authData.session.user.id);
    }

    const userId = authData.user.id;
    logger.debug('Auth user created:', userId);

    // Return success - signup.tsx will handle creating the database profile
    // with all required fields including zipcode
    return {
      success: true,
      userId,
    };
  } catch (error: any) {
    logger.error('Unexpected signup error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred',
        details: 'Please try again or contact support',
      },
    };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: AuthError; userId?: string }> {
  try {
    logger.debug('Starting signin:', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      logger.error('Signin error:', error);

      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Incorrect email or password';
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Please verify your email address';
      }

      return {
        success: false,
        error: {
          message: userMessage,
          code: error.status?.toString() || undefined,
          details: error.message,
        },
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          message: 'Login failed',
          details: 'No user data returned',
        },
      };
    }

    // Verify user exists in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, username, display_name, current_winstreak')
      .eq('id', data.user.id)
      .single();

    if (dbError || !dbUser) {
      logger.error('Database user not found for auth user:', dbError);

      // This is a ghost user - they exist in auth but not in database
      // We should NOT auto-create them, as we don't have their username
      return {
        success: false,
        error: {
          message: 'User profile not found',
          details: 'Please contact support to fix your account',
          code: 'MISSING_PROFILE',
        },
      };
    }

    logger.debug('Signin complete:', data.user.id);

    return {
      success: true,
      userId: data.user.id,
    };
  } catch (error: any) {
    logger.error('Unexpected signin error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred',
        details: 'Please try again',
      },
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{
  success: boolean;
  error?: AuthError;
}> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Signout error:', error);
      return {
        success: false,
        error: {
          message: error.message,
          details: 'Failed to sign out',
        },
      };
    }

    return { success: true };
  } catch (error: any) {
    logger.error('Unexpected signout error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logger.error('Get session error:', error);
      return null;
    }

    return session;
  } catch (error: any) {
    logger.error('Unexpected get session error:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Refresh session
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      logger.error('Refresh session error:', error);
      return null;
    }

    return data.session;
  } catch (error: any) {
    logger.error('Unexpected refresh error:', error);
    return null;
  }
}
