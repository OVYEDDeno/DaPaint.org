import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  DaPaintColors,
  DaPaintSpacing,
  DaPaintRadius,
  DaPaintTypography,
} from '../../constants/DaPaintDesign';

interface PasswordInputSectionProps {
  password: string;
  setPassword: (password: string) => void;
  loading: boolean;
  handleLogin: () => void;
}

export const PasswordInputSection: React.FC<PasswordInputSectionProps> = ({
  password,
  setPassword,
  loading,
  handleLogin,
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Enter Your Password</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="password"
          placeholderTextColor={DaPaintColors.textTertiary}
          secureTextEntry
          editable={!loading}
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: DaPaintColors.surfaceStrong,
    borderColor: DaPaintColors.border,
    borderRadius: DaPaintRadius.md,
    borderWidth: 1.5,
    minHeight: 48,
    paddingHorizontal: DaPaintSpacing.xs,
  },
  input: {
    flex: 1,
    ...DaPaintTypography.bodyLarge,
    color: DaPaintColors.textPrimary,
    backgroundColor: 'transparent',
  },
});