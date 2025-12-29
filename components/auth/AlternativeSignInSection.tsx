import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DaPaintSpacing,
  DaPaintRadius,
  DaPaintShadows,
  DaPaintTypography,
  DaPaintButtons,
} from '../../constants/DaPaintDesign';

interface AlternativeSignInSectionProps {
  onEmailPhonePress: () => void;
}

export const AlternativeSignInSection: React.FC<
  AlternativeSignInSectionProps
> = ({ onEmailPhonePress }) => {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.altButton,
          pressed && styles.altButtonPressed,
        ]}
        onPress={onEmailPhonePress}
      >
        <Text style={styles.altButtonText}>Sign In with Email or Phone</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  altButton: {
    alignItems: 'center',
    backgroundColor: DaPaintButtons.secondary.background,
    borderColor: DaPaintButtons.secondary.border,
    borderRadius: DaPaintRadius.sm,
    borderWidth: 1,
    paddingHorizontal: DaPaintSpacing.sm,
    paddingVertical: DaPaintSpacing.xs,
    ...DaPaintShadows.small,
  },
  altButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  altButtonText: {
    ...DaPaintTypography.labelMedium,
    color: DaPaintButtons.secondary.text,
  },
  container: {
    gap: DaPaintSpacing.xxs,
    paddingTop: DaPaintSpacing.xxs,
  },
});
