import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Animated,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DaPaintColors,
  DaPaintSpacing,
  DaPaintRadius,
  DaPaintShadows,
  DaPaintTypography,
  DaPaintPhysics,
} from '../../constants/DaPaintDesign';
import { getSession, signOut, signIn } from '../../lib/api/auth';
import logger from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { userDataManager } from '../../lib/UserDataManager';
import { getKeyboardDismissHandler } from '../../lib/webFocusGuard';

import { AlternativeSignInSection } from './AlternativeSignInSection';
import { PasswordInputSection } from './PasswordInputSection';
import { UsernameInputSection } from './UsernameInputSection';

const BASE_BOTTOM_PADDING = Platform.OS === 'ios' ? 20 : 16;
const MAX_KEYBOARD_LIFT = 80;

interface AuthSectionProps {
  keyboardOffset: number;
}

interface AuthFormSectionProps {
  enterStyle?: object;
  exitStyle?: object;
  keyboardHeight?: number;
}

type AuthMode = 'username' | 'password' | 'forgot-password' | 'email-phone';

export default function AuthSection({ keyboardOffset }: AuthSectionProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [authMode, setAuthMode] = useState<AuthMode>('username');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [formatValidationError, setFormatValidationError] = useState<
    string | null
  >(null);

  const [fadeAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (!userProfile) {
            await signOut();
            await userDataManager.clearCache();
            Alert.alert('Session Error', 'Please log in again.');
            setSessionChecked(true);
            return;
          }

          await userDataManager.preloadUserData();
          router.replace('/(tabs)/feed');
        }
      } catch (error) {
        logger.error('Session check error:', error);
        try {
          await signOut();
          await userDataManager.clearCache();
        } catch (e) {
          logger.error('Sign out error:', e);
        }
      } finally {
        setSessionChecked(true);
      }
    };
    checkExistingSession();
  }, [router]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DaPaintPhysics.timing.normal,
        useNativeDriver: typeof window === 'undefined',
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...DaPaintPhysics.springGentle,
        useNativeDriver: typeof window === 'undefined',
      }),
    ]).start();
  }, [authMode]);

  const handleLogin = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      let emailForAuth = resolvedEmail;

      if (!emailForAuth) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier.toLowerCase().trim())
          .single();

        if (!userData) {
          Alert.alert('Not Found', 'Please check your username and try again.');
          setLoading(false);
          return;
        }
        emailForAuth = userData.email;
      }

      const signInResult = await signIn(emailForAuth, password);

      if (!signInResult.success) {
        Alert.alert(
          'Login Failed',
          signInResult.error?.message || 'Invalid credentials.'
        );
        setLoading(false);
        return;
      }

      await userDataManager.preloadUserData();
      router.replace('/(tabs)/feed');
    } catch (err) {
      logger.error('Login error:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleCheckUsername = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setLoading(true);
    setIsChecking(true);
    setIsAvailable(null);
    setFormatValidationError(null);

    try {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('username', identifier.trim().toLowerCase())
        .maybeSingle();

      if (data) {
        setIsAvailable(false);
        setAuthMode('password');
        setResolvedEmail('');
        userDataManager.preloadUserData();
      } else {
        setIsAvailable(true);
        router.push(
          `/(auth)/signup?username=${encodeURIComponent(identifier.trim().toLowerCase())}`
        );
      }
    } catch (err) {
      logger.error('Username check error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  };

  const handleCheckEmailOrPhone = async () => {
    if (!identifier.trim()) {
      Alert.alert('Error', 'Please enter your email or phone number');
      return;
    }

    setLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(identifier.trim());

      if (isEmail) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('email', identifier.trim().toLowerCase())
          .maybeSingle();

        if (userData) {
          setResolvedEmail(userData.email);
          setAuthMode('password');
        } else {
          router.push(
            `/(auth)/signup?email=${encodeURIComponent(identifier.trim().toLowerCase())}`
          );
        }
      } else {
        const cleanPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
        const { data: users } = await supabase
          .from('users')
          .select('email')
          .eq('phone', cleanPhone);

        if (!users || users.length === 0) {
          router.push(`/(auth)/signup?phone=${encodeURIComponent(cleanPhone)}`);
        } else if (users.length === 1) {
          setResolvedEmail(users[0]?.email || '');
          setAuthMode('password');
        } else {
          Alert.alert(
            'Multiple Accounts',
            'Multiple accounts found. Please sign in with email.'
          );
          setLoading(false);
        }
      }
    } catch (err) {
      logger.error('Email/Phone check error:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier.trim()) {
      Alert.alert(
        'Error',
        'Please enter your username, email, or phone number'
      );
      return;
    }

    setLoading(true);
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      let userEmail = '';

      if (emailRegex.test(identifier.trim())) {
        userEmail = identifier.trim().toLowerCase();
      } else {
        const { data: byUsername } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier.trim().toLowerCase())
          .maybeSingle();

        if (byUsername) {
          userEmail = byUsername.email;
        } else {
          const cleanPhone = identifier.trim().replace(/[\s\-\(\)]/g, '');
          const { data: byPhone } = await supabase
            .from('users')
            .select('email')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (byPhone) {
            userEmail = byPhone.email;
          } else {
            const queryParam = emailRegex.test(identifier.trim())
              ? `email=${encodeURIComponent(identifier.trim())}`
              : `username=${encodeURIComponent(identifier.trim())}`;
            router.push(`/(auth)/signup?${queryParam}`);
            setLoading(false);
            return;
          }
        }
      }

      const redirectUrl = Platform.select({
        web: `${window.location.origin}/reset-password`,
        default: 'dapaint://reset-password',
      });

      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        logger.error('Password reset error:', error);
        Alert.alert('Error', 'Failed to send reset email. Please try again.');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Check Your Email',
        `We've sent a password reset link to ${userEmail}. Please check your inbox.`,
        [{ text: 'OK', onPress: () => setAuthMode('username') }]
      );
    } catch (err) {
      logger.error('Forgot password error:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) return null;

  const keyboardPadding = Math.min(keyboardOffset, MAX_KEYBOARD_LIFT);
  const basePadding = Math.max(insets.bottom, BASE_BOTTOM_PADDING);
  const dismissKeyboard = getKeyboardDismissHandler();

  return (
    <Pressable
      onPress={dismissKeyboard}
      accessible={false}
      style={styles.touchGuard}
    >
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <View style={styles.sheetWrapper}>
          <Animated.View
            style={[
              styles.bottomContainer,
              {
                paddingBottom: basePadding,
                marginBottom: keyboardPadding,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms and Privacy Policy.
            </Text>

            <View style={styles.formContainer}>
              {authMode === 'username' && (
                <>
                  <UsernameInputSection
                    username={identifier}
                    setUsername={setIdentifier}
                    isAvailable={isAvailable}
                    setIsAvailable={setIsAvailable}
                    formatValidationError={formatValidationError}
                    setFormatValidationError={setFormatValidationError}
                    isChecking={isChecking}
                    handleCheckUsername={handleCheckUsername}
                  />
                  <AlternativeSignInSection
                    onEmailPhonePress={() => setAuthMode('email-phone')}
                  />
                </>
              )}

              {authMode === 'email-phone' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email or Phone Number</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={identifier}
                        onChangeText={setIdentifier}
                        placeholder="email@example.com or phone"
                        placeholderTextColor={DaPaintColors.textTertiary}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>
                  <Pressable
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleCheckEmailOrPhone}
                    disabled={loading || !identifier.trim()}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Checking...' : 'Continue'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => {
                      setAuthMode('username');
                      setIdentifier('');
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Back to Username
                    </Text>
                  </Pressable>
                </>
              )}

              {authMode === 'password' && (
                <>
                  <PasswordInputSection
                    password={password}
                    setPassword={setPassword}
                    loading={loading}
                    handleLogin={handleLogin}
                  />
                  <Pressable
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleLogin}
                    disabled={loading || !password}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Text>
                  </Pressable>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[
                        styles.button,
                        styles.secondaryButton,
                        styles.halfButton,
                      ]}
                      onPress={() => {
                        setAuthMode('username');
                        setPassword('');
                        setIdentifier('');
                        setResolvedEmail('');
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.button,
                        styles.secondaryButton,
                        styles.halfButton,
                      ]}
                      onPress={() => setAuthMode('forgot-password')}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Forgot Password
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}

              {authMode === 'forgot-password' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      Username, Email, or Phone
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={identifier}
                        onChangeText={setIdentifier}
                        placeholder="Enter any of the above"
                        placeholderTextColor={DaPaintColors.textTertiary}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <Pressable
                    style={[styles.button, styles.primaryButton]}
                    onPress={handleForgotPassword}
                    disabled={loading || !identifier.trim()}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => setAuthMode('password')}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Back to Sign In
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

export const AuthFormSection: React.FC<AuthFormSectionProps> = ({
  enterStyle,
  exitStyle,
  keyboardHeight = 0,
}) => {
  return (
    <View style={[styles.container, enterStyle, exitStyle]}>
      <View style={styles.authContainer}>
        <AuthSection keyboardOffset={keyboardHeight} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: DaPaintSpacing.xxs,
  },
  authContainer: {
    maxWidth: Platform.OS === 'web' ? 460 : 400,
    width: '100%',
  },
  bottomContainer: {
    alignSelf: 'center',
    backgroundColor: DaPaintColors.surface,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.xl,
    borderWidth: 1,
    maxWidth: Platform.OS === 'web' ? 460 : 420,
    paddingHorizontal: DaPaintSpacing.sm,
    paddingTop: DaPaintSpacing.sm,
    width: '94%',
    zIndex: 9,
    ...DaPaintShadows.medium,
    gap: DaPaintSpacing.sm,
  },
  button: {
    alignItems: 'center',
    borderRadius: DaPaintRadius.sm,
    paddingHorizontal: DaPaintSpacing.sm,
    paddingVertical: DaPaintSpacing.xs,
  },
  buttonText: {
    ...DaPaintTypography.labelLarge,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: DaPaintSpacing.md,
  },
  formContainer: {
    gap: DaPaintSpacing.xs,
  },
  halfButton: {
    flex: 1,
  },
  input: {
    flex: 1,
    ...DaPaintTypography.bodyLarge,
    backgroundColor: 'transparent',
    color: DaPaintColors.textPrimary,
  },
  inputContainer: {
    gap: DaPaintSpacing.xxs,
  },
  inputLabel: {
    ...DaPaintTypography.labelMedium,
    color: DaPaintColors.textPrimary,
  },
  inputWrapper: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.surfaceStrong,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: DaPaintSpacing.xs,
  },
  kav: { flex: 1 },
  primaryButton: {
    backgroundColor: DaPaintColors.primaryDeep,
    ...DaPaintShadows.medium,
  },
  secondaryButton: {
    backgroundColor: 'rgba(0,92,130,0.12)',
    borderColor: 'rgba(0,92,130,0.25)',
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...DaPaintTypography.labelMedium,
    color: DaPaintColors.primaryDeep,
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  termsText: {
    ...DaPaintTypography.bodySmall,
    color: DaPaintColors.textSecondary,
    opacity: 0.7,
    textAlign: 'center',
  },
  touchGuard: { flex: 1 },
});
