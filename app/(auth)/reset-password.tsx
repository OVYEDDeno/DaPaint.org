// app/(auth)/reset-password.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';
import {
  DaPaintColors,
  DaPaintSpacing,
  DaPaintRadius,
  DaPaintShadows,
  DaPaintTypography,
} from '../../constants/DaPaintDesign';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.error('Password update error:', error);
        Alert.alert('Error', error.message || 'Failed to update password');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Success',
        'Your password has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/feed'),
          },
        ]
      );
    } catch (err) {
      logger.error('Reset password error:', err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Reset Your Password</Text>
          <Text style={styles.subtitle}>
            Enter a new password for your account
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={DaPaintColors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor={DaPaintColors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
              />
            </View>
          </View>

          <Pressable
            style={[
              styles.button,
              styles.primaryButton,
              (!newPassword || !confirmPassword || loading) && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={!newPassword || !confirmPassword || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Updating...' : 'Update Password'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DaPaintColors.bg0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: DaPaintSpacing.lg,
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    gap: DaPaintSpacing.xxs,
    marginBottom: DaPaintSpacing.xl,
  },
  title: {
    ...DaPaintTypography.displayLarge,
    color: DaPaintColors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: DaPaintSpacing.md,
  },
  inputContainer: {
    gap: DaPaintSpacing.xxs,
  },
  inputLabel: {
    ...DaPaintTypography.labelMedium,
    color: DaPaintColors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    backgroundColor: DaPaintColors.surface,
    minHeight: 48,
    paddingHorizontal: DaPaintSpacing.xs,
  },
  input: {
    flex: 1,
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textPrimary,
    backgroundColor: 'transparent',
  },
  button: {
    paddingVertical: DaPaintSpacing.sm,
    paddingHorizontal: DaPaintSpacing.md,
    borderRadius: DaPaintRadius.sm,
    alignItems: 'center',
    marginTop: DaPaintSpacing.xs,
  },
  primaryButton: {
    backgroundColor: DaPaintColors.primaryDeep,
    ...DaPaintShadows.medium,
  },
  buttonText: {
    ...DaPaintTypography.labelLarge,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});