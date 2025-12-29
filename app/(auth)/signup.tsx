// app/(auth)/signup.tsx - Fixed signup with proper user creation
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BackgroundLayer from '../../components/ui/BackgroundLayer';
import {
  DaPaintColors,
  DaPaintSpacing,
  DaPaintRadius,
  DaPaintShadows,
  DaPaintTypography,
  DaPaintDatePickerTheme,
} from '../../constants/DaPaintDesign';
import { signUp } from '../../lib/api/auth';
import logger from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { userDataManager } from '../../lib/UserDataManager';
import { getKeyboardDismissHandler } from '../../lib/webFocusGuard';

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  try {
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    logger.warn('DateTimePicker not available:', e);
  }
}

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { username, email, phone } = {
    username: (params.username as string) || '',
    email: (params.email as string) || '',
    phone: (params.phone as string) || '',
  };

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: email || '',
    password: '',
    phone: phone || '',
    birthday: new Date(2006, 0, 1),
    city: '',
    postalCode: '',
    howDidYouHear: '',
  });
  const [usernameInput, setUsernameInput] = useState(username || '');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const dismissKeyboard = getKeyboardDismissHandler();

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          logger.debug('User already logged in, redirecting to feed');
          await userDataManager.preloadUserData();
          router.replace('/(tabs)/feed');
        }
      } catch (error) {
        logger.error('Error checking existing session:', error);
      } finally {
        setSessionChecked(true);
      }
    };
    checkExistingSession();
  }, []);

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const calculateAge = (birthday: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthday.getDate())
    ) {
      age--;
    }

    return age;
  };

  const onDateChange = (_event: { type?: string }, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      updateField('birthday', selectedDate);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!usernameInput.trim()) {
        Alert.alert('Try Again', 'Username is required');
        return;
      }

      if (!formData.email) {
        Alert.alert('Try Again', 'Email is required');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert('Try Again', 'Please enter a valid email address');
        return;
      }

      if (!formData.password) {
        Alert.alert('Try Again', 'Password is required');
        return;
      }

      if (formData.password.length < 6) {
        Alert.alert('Try Again', 'Password must be at least 6 characters long');
        return;
      }
    }

    if (step === 2) {
      if (!formData.phone) {
        Alert.alert('Try Again', 'Phone number is required');
        return;
      }

      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(formData.phone)) {
        Alert.alert('Try Again', 'Please enter a valid phone number');
        return;
      }
    }

    if (step === 3) {
      const age = calculateAge(formData.birthday);
      if (age < 18) {
        Alert.alert(
          'Too Young',
          'You must be at least 18 years old to sign up'
        );
        return;
      }
    }

    if (step === 4) {
      if (!formData.postalCode || formData.postalCode.trim().length < 3) {
        Alert.alert('Try Again', 'Please enter a valid postal code');
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push('../');
    }
  };

  const handleSignup = async () => {
    setLoading(true);

    try {
      // Validate all required fields
      if (
        !formData.email ||
        !formData.password ||
        !formData.phone ||
        !formData.postalCode
      ) {
        Alert.alert(
          'Missing Information',
          'Please fill in all required fields.'
        );
        setLoading(false);
        return;
      }

      const normalizedUsername = usernameInput?.toLowerCase().trim() || '';
      if (!normalizedUsername) {
        Alert.alert('Missing Information', 'Username is required.');
        setLoading(false);
        return;
      }

      logger.debug('Starting signup process for:', normalizedUsername);

      // Step 1: Create auth user
      const authResult = await signUp(
        formData.email,
        formData.password,
        normalizedUsername
      );

      if (!authResult.success || !authResult.userId) {
        logger.error('Auth signup failed:', authResult.error);
        Alert.alert(
          'Sign Up Failed',
          authResult.error?.message || 'Could not create account.'
        );
        setLoading(false);
        return;
      }

      const userId = authResult.userId;
      logger.debug('Auth user created successfully:', userId);

      // Step 2: Create user profile in database (CRITICAL - must use INSERT not UPSERT)
      try {
        const userProfile = {
          id: userId,
          username: normalizedUsername,
          display_name: normalizedUsername,
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone,
          city: formData.city || null,
          zipcode: formData.postalCode,
          birthday: formData.birthday.toISOString().split('T')[0],
          how_did_you_hear: formData.howDidYouHear || null,
          current_winstreak: 0,
          highest_winstreak: 0, // Note: your DB has this column name
          current_lossstreak: 0,
          highest_lossstreak: 0,
          wins: 0,
          losses: 0,
          disqualifications: 0,
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          is_active: true,
        };

        logger.debug('Creating user profile:', {
          userId,
          username: normalizedUsername,
        });

        // Use INSERT to catch conflicts properly
        const { data: insertedUser, error: profileError } = await supabase
          .from('users')
          .insert(userProfile)
          .select()
          .single();

        if (profileError) {
          throw profileError;
        }

        if (!insertedUser) {
          throw new Error('User profile was not created');
        }

        logger.debug('User profile created successfully:', insertedUser.id);
      } catch (profileError: any) {
        logger.error(
          'CRITICAL: Profile creation failed, cleaning up auth user',
          profileError
        );

        // GHOST USER PREVENTION: Delete auth user if profile creation fails
        try {
          await supabase.auth.signOut();
          logger.debug('Signed out after profile creation failure');
        } catch (signOutError) {
          logger.error(
            'Error signing out after profile failure:',
            signOutError
          );
        }

        // Provide specific error messages
        if (profileError.code === '23505') {
          // Unique constraint violation
          if (profileError.message?.includes('username')) {
            Alert.alert(
              'Sign Up Failed',
              'This username is already taken. Please choose another.'
            );
          } else if (profileError.message?.includes('email')) {
            Alert.alert('Sign Up Failed', 'This email is already registered.');
          } else {
            Alert.alert('Sign Up Failed', 'This account already exists.');
          }
        } else if (profileError.code === '23514') {
          // Check constraint violation
          Alert.alert(
            'Sign Up Failed',
            'Please check your information. All required fields must be filled.'
          );
        } else {
          Alert.alert(
            'Sign Up Failed',
            'Could not create your profile. Please try again or contact support.'
          );
        }

        setLoading(false);
        return;
      }

      // Step 3: Notification settings will be created automatically by database trigger
      logger.debug('Notification settings will be created by trigger');

      // Step 4: Verify session was created and persisted
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          logger.error(
            'No session found after signup - this should not happen'
          );
          Alert.alert(
            'Sign Up Issue',
            'Account created but please sign in manually.'
          );
          router.replace('/(auth)');
          return;
        }
        logger.debug('Session verified after signup:', session.user.id);
      } catch (sessionError) {
        logger.error('Error verifying session:', sessionError);
      }

      // Step 5: Preload user data and navigate
      logger.debug('Preloading user data...');
      await userDataManager.preloadUserData();

      logger.debug('Signup complete, navigating to feed');
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      logger.error('Unexpected signup error:', error);
      Alert.alert('Sign Up Failed', 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (!sessionChecked) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <BackgroundLayer />
      <Pressable
        onPress={dismissKeyboard}
        accessible={false}
        style={styles.touchGuard}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <View style={styles.progressContainer}>
              {[1, 2, 3, 4].map(stepNum => (
                <View
                  key={stepNum}
                  style={[
                    styles.progressDot,
                    step >= stepNum
                      ? styles.progressDotActive
                      : styles.progressDotInactive,
                  ]}
                />
              ))}
            </View>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {step === 1 && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>Account Info</Text>
                <Text style={styles.stepSubtitle}>
                  Create your login credentials
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username *</Text>
                  <View style={styles.usernameContainer}>
                    <Text style={styles.usernamePrefix}>@</Text>
                    <TextInput
                      style={styles.usernameInput}
                      value={usernameInput}
                      onChangeText={setUsernameInput}
                      placeholder="username"
                      placeholderTextColor={DaPaintColors.textTertiary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="username"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={text => updateField('email', text)}
                    placeholder="your@email.com"
                    placeholderTextColor={DaPaintColors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    textContentType="emailAddress"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={text => updateField('password', text)}
                    placeholder="At least 6 characters"
                    placeholderTextColor={DaPaintColors.textTertiary}
                    secureTextEntry
                    textContentType="newPassword"
                  />
                </View>

                <View style={styles.exampleBox}>
                  <Text style={styles.exampleTitle}>Password Tips</Text>
                  <Text style={styles.exampleText}>
                    • Use at least 6 characters
                  </Text>
                  <Text style={styles.exampleText}>
                    • Mix letters, numbers, and symbols
                  </Text>
                  <Text style={styles.exampleText}>
                    • Don't use easily guessed passwords
                  </Text>
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>Contact Info</Text>
                <Text style={styles.stepSubtitle}>How can we reach you?</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={text => updateField('phone', text)}
                    placeholder="(123) 456-7890"
                    placeholderTextColor={DaPaintColors.textTertiary}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                  />
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoIcon}>📞</Text>
                  <Text style={styles.infoText}>
                    We'll only contact you for important account updates
                  </Text>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>Birthday</Text>
                <Text style={styles.stepSubtitle}>
                  We need this to verify you're 18+
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Birthday *</Text>
                  {Platform.OS === 'web' ? (
                    <TextInput
                      style={styles.input}
                      value={formatDate(formData.birthday)}
                      onChangeText={text => {
                        const parts = text.split('/');
                        if (
                          parts.length === 3 &&
                          parts[0] &&
                          parts[1] &&
                          parts[2]
                        ) {
                          const year = parseInt(parts[2]);
                          const month = parseInt(parts[0]) - 1;
                          const day = parseInt(parts[1]);
                          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                            const date = new Date(year, month, day);
                            if (!isNaN(date.getTime())) {
                              updateField('birthday', date);
                            }
                          }
                        }
                      }}
                      placeholder="MM/DD/YYYY"
                      placeholderTextColor={DaPaintColors.textTertiary}
                      keyboardType="numeric"
                    />
                  ) : (
                    <>
                      <Pressable
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text style={styles.dateButtonText}>
                          {formatDate(formData.birthday)}
                        </Text>
                      </Pressable>
                      {showDatePicker && DateTimePicker && (
                        <View style={styles.datePickerWrapper}>
                          <DateTimePicker
                            value={formData.birthday}
                            mode="date"
                            display={
                              Platform.OS === 'ios' ? 'spinner' : 'default'
                            }
                            onChange={onDateChange}
                            maximumDate={new Date()}
                            themeVariant={DaPaintDatePickerTheme.themeVariant}
                            textColor={DaPaintDatePickerTheme.textColor}
                            style={styles.dateTimePicker}
                          />
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoIcon}>🎂</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoText}>
                      This helps us verify you meet the age requirement
                    </Text>
                    <Text
                      style={[
                        styles.infoText,
                        { marginTop: DaPaintSpacing.xxs },
                      ]}
                    >
                      We'll never share your birthday with other users
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {step === 4 && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>Location</Text>
                <Text style={styles.stepSubtitle}>
                  Help us connect you with local DaPaints
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.city}
                    onChangeText={text => updateField('city', text)}
                    placeholder="Miami"
                    placeholderTextColor={DaPaintColors.textTertiary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Postal Code *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.postalCode}
                    onChangeText={text =>
                      updateField('postalCode', text.toUpperCase())
                    }
                    placeholder="e.g., 90210 or SW1A 1AA"
                    placeholderTextColor={DaPaintColors.textTertiary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    keyboardType="default"
                    textContentType="postalCode"
                    maxLength={12}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>How did you hear about us?</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.howDidYouHear}
                    onChangeText={text => updateField('howDidYouHear', text)}
                    placeholder="Friend referral, social media, etc."
                    placeholderTextColor={DaPaintColors.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text style={styles.infoText}>
                    Only users in your area will see your public DaPaints
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable
              style={styles.nextButton}
              onPress={step === 4 ? handleSignup : handleNext}
              disabled={loading}
            >
              <Text style={styles.nextButtonText}>
                {loading
                  ? 'Creating Account...'
                  : step === 4
                    ? 'Create Account'
                    : 'Next'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    borderColor: `${DaPaintColors.primaryDeep}60`,
    borderRadius: DaPaintRadius.sm,
    borderWidth: 1.5,
    flex: 1,
    minHeight: 48,
    padding: DaPaintSpacing.sm,
  },
  backButtonText: {
    ...DaPaintTypography.labelLarge,
    color: DaPaintColors.primaryDeep,
  },
  container: { backgroundColor: 'transparent', flex: 1 },
  content: { flex: 1 },
  dateButton: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.surface,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1.5,
    padding: DaPaintSpacing.sm,
  },
  dateButtonText: {
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textPrimary,
  },
  datePickerWrapper: { alignItems: 'center', justifyContent: 'center' },
  dateTimePicker: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: DaPaintRadius.md,
    marginTop: DaPaintSpacing.lg,
  },
  exampleBox: {
    backgroundColor: DaPaintColors.surface,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1,
    marginTop: DaPaintSpacing.lg,
    padding: DaPaintSpacing.sm,
  },
  exampleText: {
    ...DaPaintTypography.bodyMedium,
    color: DaPaintColors.textSecondary,
    marginBottom: 4,
  },
  exampleTitle: {
    ...DaPaintTypography.labelMedium,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.xxs,
  },
  footer: {
    borderTopColor: DaPaintColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: DaPaintSpacing.xs,
    padding: DaPaintSpacing.lg,
    paddingTop: DaPaintSpacing.sm,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: DaPaintColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: DaPaintSpacing.lg,
    paddingBottom: DaPaintSpacing.headerBottom,
    paddingTop: DaPaintSpacing.headerTop,
  },
  infoBox: {
    backgroundColor: DaPaintColors.surface,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: DaPaintSpacing.lg,
    padding: DaPaintSpacing.sm,
  },
  infoIcon: { fontSize: 20, marginRight: DaPaintSpacing.xs },
  infoText: {
    flex: 1,
    ...DaPaintTypography.bodyMedium,
    color: DaPaintColors.textSecondary,
    lineHeight: 20,
  },
  input: {
    backgroundColor: DaPaintColors.surface,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1.5,
    padding: DaPaintSpacing.sm,
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textPrimary,
    minHeight: 48,
  },
  inputGroup: { marginBottom: DaPaintSpacing.lg },
  label: {
    ...DaPaintTypography.labelMedium,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.xxs,
  },
  nextButton: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.primaryDeep,
    borderRadius: DaPaintRadius.sm,
    flex: 2,
    minHeight: 48,
    padding: DaPaintSpacing.sm,
    ...DaPaintShadows.medium,
  },
  nextButtonText: {
    ...DaPaintTypography.labelLarge,
    color: '#ffffff',
  },
  progressContainer: { alignItems: 'center', flexDirection: 'row' },
  progressDot: { borderRadius: 4, height: 8, marginHorizontal: 4, width: 8 },
  progressDotActive: { backgroundColor: DaPaintColors.primaryDeep },
  progressDotInactive: { backgroundColor: `${DaPaintColors.primaryDeep}40` },
  screen: { flex: 1 },
  scrollContent: { padding: DaPaintSpacing.lg, paddingTop: DaPaintSpacing.md },
  step: { flex: 1 },
  stepSubtitle: {
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textSecondary,
    marginBottom: DaPaintSpacing.xl,
  },
  stepTitle: {
    ...DaPaintTypography.displayMedium,
    color: DaPaintColors.textPrimary,
    marginBottom: DaPaintSpacing.xxs,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  title: {
    ...DaPaintTypography.displayLarge,
    color: DaPaintColors.textPrimary,
  },
  touchGuard: { flex: 1 },
  usernameContainer: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.surface,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    padding: DaPaintSpacing.sm,
  },
  usernameInput: {
    flex: 1,
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textPrimary,
    padding: 0,
  },
  usernamePrefix: {
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textPrimary,
    marginRight: 4,
  },
});
