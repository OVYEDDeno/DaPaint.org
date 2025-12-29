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

export const AlternativeSignInSection: React.FC<AlternativeSignInSectionProps> = ({
  onEmailPhonePress,
}) => {
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
  container: {
    gap: DaPaintSpacing.xxs,
    paddingTop: DaPaintSpacing.xxs,
  },
  altButton: {
    backgroundColor: DaPaintButtons.secondary.background,
    borderWidth: 1,
    borderColor: DaPaintButtons.secondary.border,
    borderRadius: DaPaintRadius.sm,
    paddingVertical: DaPaintSpacing.xs,
    paddingHorizontal: DaPaintSpacing.sm,
    alignItems: 'center',
    ...DaPaintShadows.small,
  },
  altButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  altButtonText: {
    ...DaPaintTypography.labelMedium,
    color: DaPaintButtons.secondary.text,
  },
});