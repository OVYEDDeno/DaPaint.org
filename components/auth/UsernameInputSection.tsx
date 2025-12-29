import React, { useState, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
} from 'react-native';

import {
  DaPaintColors,
  DaPaintSpacing,
  DaPaintRadius,
  DaPaintShadows,
  DaPaintTypography,
} from '../../constants/DaPaintDesign';

interface UsernameInputSectionProps {
  username: string;
  setUsername: (username: string) => void;
  isAvailable: boolean | null;
  setIsAvailable: (isAvailable: boolean | null) => void;
  formatValidationError: string | null;
  setFormatValidationError: (error: string | null) => void;
  isChecking: boolean;
  handleCheckUsername: () => void;
}

export const UsernameInputSection: React.FC<UsernameInputSectionProps> = ({
  username,
  setUsername,
  isAvailable,
  setIsAvailable,
  formatValidationError,
  setFormatValidationError,
  isChecking,
  handleCheckUsername,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Determine border color and shadow based on state
  const getBorderColor = () => {
    if (isAvailable === true) return `${DaPaintColors.success}99`;
    if (formatValidationError || isAvailable === false)
      return `${DaPaintColors.error}99`;
    return DaPaintColors.border;
  };

  const getContainerStyle = () => {
    if (isAvailable === true) return DaPaintShadows.glowSuccess;
    if (formatValidationError || isAvailable === false)
      return DaPaintShadows.glowError;
    return DaPaintShadows.glowPrimary;
  };

  // Conversion-focused animation: runs 3 loops then stops
  useEffect(() => {
    if (!username && !isFocused && !hasInteracted) {
      // Run 3 gentle pulses to draw attention
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: typeof window === 'undefined',
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: typeof window === 'undefined',
          }),
        ]),
        { iterations: 3 } // Only 3 loops = ~4.8 seconds total
      ).start();
    } else {
      // Stop animation when user interacts
      pulseAnim.setValue(0);
    }
  }, [username, isFocused, hasInteracted]);

  const handleFocus = () => {
    setIsFocused(true);
    setHasInteracted(true);
  };

  const handleChangeText = (text: string) => {
    setUsername(text.toLowerCase().trim());
    setIsAvailable(null);
    setFormatValidationError(null);
    setHasInteracted(true);
  };

  // Interpolate scale and color for smooth animation
  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const color = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DaPaintColors.textTertiary, DaPaintColors.primary],
  });

  return (
    <View style={styles.inputContainer}>
      <View
        style={[
          styles.usernameInputContainer,
          getContainerStyle(),
          { borderColor: getBorderColor() },
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.usernameInput}
            value={username}
            onChangeText={handleChangeText}
            placeholder=""
            placeholderTextColor={DaPaintColors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isChecking}
            textContentType="username"
            returnKeyType="done"
            onSubmitEditing={handleCheckUsername}
            onFocus={handleFocus}
            onBlur={() => setIsFocused(false)}
          />
          {!username && (
            <Animated.Text
              style={[
                styles.placeholderText,
                {
                  transform: [{ scale }],
                  color,
                },
              ]}
            >
              Enter Username
            </Animated.Text>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            pressed && styles.continueButtonPressed,
            (!username.trim() || isChecking) && styles.continueButtonDisabled,
          ]}
          onPress={() => {
            if (!username.trim()) {
              alert('Please enter a username');
              return;
            }
            handleCheckUsername();
          }}
          disabled={!username.trim() || isChecking}
        >
          <Text style={styles.continueButtonText}>
            {isChecking ? 'Checking...' : "Start My Streak - It's Free!"}
          </Text>
        </Pressable>
      </View>
      {formatValidationError && (
        <Text style={styles.validationErrorText}>{formatValidationError}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  continueButton: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.primaryDeep,
    borderRadius: DaPaintRadius.xs,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: DaPaintSpacing.sm,
    ...DaPaintShadows.medium,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  continueButtonText: {
    ...DaPaintTypography.labelSmall,
    color: '#ffffff',
    fontWeight: '700',
  },
  inputContainer: {
    gap: DaPaintSpacing.xxs,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholderText: {
    left: DaPaintSpacing.xxs,
    position: 'absolute',
    right: DaPaintSpacing.xxs,
    ...DaPaintTypography.labelMedium,
    fontSize: 14,
    color: DaPaintColors.textTertiary,
    pointerEvents: 'none',
  },
  usernameInput: {
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textPrimary,
    paddingHorizontal: DaPaintSpacing.xxs,
    paddingVertical: 0,
  },
  usernameInputContainer: {
    alignItems: 'center',
    backgroundColor: DaPaintColors.surface,
    borderRadius: DaPaintRadius.sm,
    borderWidth: 2,
    flexDirection: 'row',
    gap: DaPaintSpacing.xxs,
    height: 52,
    paddingHorizontal: DaPaintSpacing.xxs,
  },
  validationErrorText: {
    ...DaPaintTypography.bodySmall,
    color: DaPaintColors.error,
    paddingLeft: DaPaintSpacing.xxs,
  },
});
