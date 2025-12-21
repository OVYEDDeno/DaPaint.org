// app/(auth)/signup.tsx - Multi-step Signup Process
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import { userDataManager } from '../../lib/UserDataManager';
import { DaPaintColors, DaPaintDatePickerTheme } from '../../constants/DaPaintDesign';
import { theme } from '../../constants/theme';
import { getKeyboardDismissHandler, stopEventOnWeb } from '../../lib/webFocusGuard';
import BackgroundLayer from '../../components/ui/BackgroundLayer';

// Conditional import for DateTimePicker - only import on native platforms
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
  const { username } = useLocalSearchParams<{ username: string }>();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    birthday: new Date(2006, 0, 1), // Default to Jan 1, 2006 (18 years old)
    city: '',
    postalCode: '',
    howDidYouHear: '',
  });
  const [usernameInput, setUsernameInput] = useState(username || '');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const dismissKeyboard = getKeyboardDismissHandler();

  // Check for existing session when component mounts
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          logger.debug('User already logged in, redirecting to feed');
          await userDataManager.preloadUserData();
          router.replace('/(tabs)/feed');
          return;
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
      year: 'numeric' 
    });
  };

  const calculateAge = (birthday: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    
    return age;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
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

      // Email validation
      if (!formData.email) {
        Alert.alert('Try Again', 'Email is required');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert('Try Again', 'Please enter a valid email address');
        return;
      }
      
      // Password validation
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
      // Phone validation (required and basic format)
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
      // Age validation (must be 18+)
      const age = calculateAge(formData.birthday);
      if (age < 18) {
        Alert.alert('Too Young', 'You must be at least 18 years old to sign up');
        return;
      }
    }
    
    if (step === 4) {
      // Postal code validation (required and at least 3 chars)
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
    }
  };

  const handleSignup = async () => {
    setLoading(true);

    try {
      // Validate required fields before proceeding
      if (!formData.email || !formData.password || !formData.phone) {
        Alert.alert('Missing Information', 'Please fill in all required fields (email, password, and phone number).');
        setLoading(false);
        return;
      }

      if (!formData.postalCode) {
        Alert.alert('Missing Information', 'Postal code is required to create your account.');
        setLoading(false);
        return;
      }

      // First, sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        logger.error('Auth error:', authError);
        Alert.alert('Sign Up Failed', 'We could not create your account. Please check your email and password and try again.');
        return;
      }

      if (!authData.user) {
        Alert.alert('Sign Up Failed', 'We could not create your account. Please try again.');
        return;
      }

      // Create user profile with CORRECT column names
      const normalizedUsername = usernameInput?.toLowerCase() || '';
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        username: normalizedUsername,
        display_name: normalizedUsername || 'user',
        email: formData.email,
        phone: formData.phone || null,
        city: formData.city || null,
        zipcode: formData.postalCode, // This is now required, no null fallback
        birthday: formData.birthday.toISOString().split('T')[0],
        how_did_you_hear: formData.howDidYouHear || null,
        current_winstreak: 0,
      });

      if (profileError) {
        logger.error('Profile creation error:', profileError);

        // Sign out to avoid a partially-created session on the device
        try {
          await supabase.auth.signOut();
        } catch (cleanupError) {
          logger.error('Error signing out after profile creation failure:', cleanupError);
        }

        // Handle specific error cases and surface useful guidance
        if (profileError.code === '23514') {
          // Constraint violation (likely postal code check)
          Alert.alert('Sign Up Failed', 'Please check your information. Postal code cannot be empty.');
        } else if (profileError.code === '23505') {
          // Unique constraint violation (likely username already taken)
          Alert.alert('Sign Up Failed', 'This username is already taken. Please try a different one.');
        } else {
          Alert.alert('Sign Up Failed', 'We could not save your information. Please check your details and try again.');
        }
        return;
      }

      logger.debug('Profile created successfully');

      // Preload user data
      await userDataManager.preloadUserData();
      
      // Navigate to feed
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      logger.error('Signup error:', error);
      Alert.alert('Sign Up Failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything until we've checked for existing sessions
  if (!sessionChecked) {
    return null;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <BackgroundLayer />
      <Pressable onPress={dismissKeyboard} accessible={false} style={styles.touchGuard}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((stepNum) => (
            <View 
              key={stepNum} 
              style={[
                styles.progressDot, 
                step >= stepNum ? styles.progressDotActive : styles.progressDotInactive
              ]} 
            />
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Account Info */}
        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Account Info</Text>
            <Text style={styles.stepSubtitle}>Create your login credentials</Text>

            {/* Username (from previous screen) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username *</Text>
                <View style={styles.usernameContainer}>
                  <Text style={styles.usernamePrefix}>@</Text>
                  <TextInput
                    style={styles.usernameInput}
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                    placeholder="username"
                    placeholderTextColor="rgba(0, 92, 130, 0.55)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    returnKeyType="next"
                  />
                </View>
              </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => updateField('email', text)}
                placeholder="your@email.com"
                placeholderTextColor="rgba(0, 92, 130, 0.55)"
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => updateField('password', text)}
                  placeholder="At least 6 characters"
                  placeholderTextColor="rgba(0, 92, 130, 0.55)"
                  secureTextEntry
                  textContentType="newPassword"
                />
            </View>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleTitle}>Password Tips</Text>
              <Text style={styles.exampleText}>• Use at least 6 characters</Text>
              <Text style={styles.exampleText}>• Mix letters, numbers, and symbols</Text>
              <Text style={styles.exampleText}>• Don't use easily guessed passwords</Text>
            </View>
          </View>
        )}

        {/* Step 2: Contact Info */}
        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Contact Info</Text>
            <Text style={styles.stepSubtitle}>How can we reach you?</Text>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => updateField('phone', text)}
                  placeholder="(123) 456-7890"
                  placeholderTextColor="rgba(0, 92, 130, 0.55)"
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

        {/* Step 3: Birthday */}
        {step === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Birthday</Text>
            <Text style={styles.stepSubtitle}>We need this to verify you're 18+</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Birthday *</Text>
              {Platform.OS === 'web' ? (
                // Text input fallback for web
                  <TextInput
                    style={styles.input}
                    value={formatDate(formData.birthday)}
                    onChangeText={(text) => {
                      // Parse MM/DD/YYYY format
                      const parts = text.split('/');
                      if (parts.length === 3) {
                        const date = new Date(parts[2], parts[0] - 1, parts[1]);
                        if (!isNaN(date.getTime())) {
                          updateField('birthday', date);
                        }
                      }
                    }}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor="rgba(0, 92, 130, 0.55)"
                    keyboardType="numeric"
                  />
              ) : (
                // Native date picker
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
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
                <Text style={[styles.infoText, { marginTop: 8 }]}>
                  We'll never share your birthday with other users
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Location */}
        {step === 4 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Location</Text>
            <Text style={styles.stepSubtitle}>Help us connect you with local DaPaints</Text>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city}
                  onChangeText={(text) => updateField('city', text)}
                  placeholder="Miami"
                  placeholderTextColor="rgba(0, 92, 130, 0.55)"
                />
            </View>

            {/* Postal Code */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Postal Code *</Text>
              <TextInput
                style={styles.input}
                value={formData.postalCode}
                onChangeText={(text) => updateField('postalCode', text.toUpperCase())}
                placeholder="e.g., 90210 or SW1A 1AA"
                placeholderTextColor="rgba(0, 92, 130, 0.55)"
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="default"
                textContentType="postalCode"
                maxLength={12}
              />
            </View>

            {/* How did you hear about us? */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>How did you hear about us?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.howDidYouHear}
                  onChangeText={(text) => updateField('howDidYouHear', text)}
                  placeholder="Friend referral, social media, etc."
                  placeholderTextColor="rgba(0, 92, 130, 0.55)"
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

          {/* Footer Buttons */}
          <View style={styles.footer}>
            {step > 1 && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
              onPress={step === 4 ? handleSignup : handleNext}
              disabled={loading}
            >
              <Text style={styles.nextButtonText}>
                {loading ? 'Creating Account...' : step === 4 ? 'Create Account' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  touchGuard: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: theme.space.headerTop,
    paddingBottom: theme.space.headerBottom,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 92, 130, 0.14)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#005c82',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#005c82',
  },
  progressDotInactive: {
    backgroundColor: 'rgba(0, 92, 130, 0.24)',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
  },
  step: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#005c82',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(0, 92, 130, 0.8)',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#005c82',
    marginBottom: 8,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 92, 130, 0.28)',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
  },
  usernamePrefix: {
    color: '#005c82',
    fontSize: 18,
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    color: '#005c82',
    fontSize: 16,
    padding: 0,
    margin: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0, 92, 130, 0.25)',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    color: '#005c82',
    fontSize: 16,
    minHeight: 48,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: 'rgba(0, 92, 130, 0.25)',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#005c82',
    fontSize: 16,
  },
  dateTimePicker: {
    backgroundColor: 'transparent',
    marginTop: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 92, 130, 0.16)',
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#005c82',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(0, 92, 130, 0.82)',
    marginBottom: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 92, 130, 0.16)',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#005c82',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(0, 92, 130, 0.82)',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 92, 130, 0.14)',
  },
  backButton: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 92, 130, 0.35)',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    minHeight: 48,
  },
  backButtonText: {
    color: '#005c82',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#005c82',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flex: 2,
    minHeight: 48,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
