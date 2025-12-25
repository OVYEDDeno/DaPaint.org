// lib/api/auth.ts - IMPROVED with proper error handling and debugging
import { supabase } from '../supabase';
import logger from '../logger';

export type AuthError = {
  message: string;
  code?: string | undefined;
  details?: string;
};

/**
 * Sign up a new user
 * Creates auth user AND database user entry
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; error?: AuthError; userId?: string }> {
  try {
    logger.debug('Starting signup:', { email, displayName });

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim()
        }
      }
    });

    if (authError) {
      logger.error('Auth signup error:', authError);
      return {
        success: false,
        error: {
          message: authError.message,
          code: authError.status?.toString() || undefined,
          details: 'Failed to create authentication account'
        }
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: {
          message: 'No user returned from signup',
          details: 'Authentication succeeded but no user data returned'
        }
      };
    }

    logger.debug('Auth user created:', authData.user.id);

    // Step 2: Create database user entry
    // Note: This might be handled by a database trigger
    // But we'll check and create if needed
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (!existingUser) {
      logger.debug('Creating database user entry...');
      
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: email.toLowerCase().trim(),
          display_name: displayName.trim(),
          current_winstreak: 0,
          longest_winstreak: 0,
          created_at: new Date().toISOString()
        });

      if (dbError) {
        logger.error('Database user creation error:', dbError);
        
        // User was created in auth but not in database
        // This is a critical error
        return {
          success: false,
          error: {
            message: 'Failed to create user profile',
            details: dbError.message,
            code: dbError.code
          }
        };
      }
    }

    logger.debug('Signup complete:', authData.user.id);

    return {
      success: true,
      userId: authData.user.id
    };

  } catch (error: any) {
    logger.error('Unexpected signup error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred',
        details: 'Please try again or contact support'
      }
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
      password
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
          details: error.message
        }
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          message: 'Login failed',
          details: 'No user data returned'
        }
      };
    }

    // Verify user exists in database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, display_name, current_winstreak')
      .eq('id', data.user.id)
      .single();

    if (dbError || !dbUser) {
      logger.error('Database user not found:', dbError);
      
      // User exists in auth but not in database
      // Try to create database entry
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email.toLowerCase().trim(),
          display_name: data.user.user_metadata?.display_name || 'User',
          current_winstreak: 0,
          longest_winstreak: 0,
          created_at: new Date().toISOString()
        });

      if (createError) {
        logger.error('Failed to create missing user:', createError);
        return {
          success: false,
          error: {
            message: 'User profile not found',
            details: 'Please contact support to fix your account',
            code: 'MISSING_PROFILE'
          }
        };
      }
      
      logger.debug('Created missing user profile');
    }

    logger.debug('Signin complete:', data.user.id);

    return {
      success: true,
      userId: data.user.id
    };

  } catch (error: any) {
    logger.error('Unexpected signin error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred',
        details: 'Please try again'
      }
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Signout error:', error);
      return {
        success: false,
        error: {
          message: error.message,
          details: 'Failed to sign out'
        }
      };
    }

    return { success: true };

  } catch (error: any) {
    logger.error('Unexpected signout error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'An unexpected error occurred'
      }
    };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

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