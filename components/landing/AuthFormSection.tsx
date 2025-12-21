import React from 'react';
import { View, StyleSheet } from 'react-native';
import AuthSection from './AuthSection';

interface AuthFormSectionProps {
  animation?: any;
  enterStyle?: object;
  exitStyle?: object;
  keyboardHeight?: number;
}

/**
 * 📋 AUTH FORM SECTION
 * 
 * Wrapper component for authentication form in landing page
 */
export const AuthFormSection: React.FC<AuthFormSectionProps> = ({
  animation,
  enterStyle,
  exitStyle,
  keyboardHeight = 0,
}) => {
  return (
    <View
      style={[styles.container, enterStyle, exitStyle]}
    >
      <View style={styles.authContainer}>
        <AuthSection keyboardOffset={keyboardHeight} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  authContainer: {
    width: '100%',
    maxWidth: 400,
  },
});
