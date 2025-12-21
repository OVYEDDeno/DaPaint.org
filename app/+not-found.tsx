// app/+not-found.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { theme } from '../constants/theme';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.subtitle}>Page Not Found</Text>
      <Text style={styles.description}>
        Sorry, the page you're looking for doesn't exist or has been moved.
      </Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.push('/')}
      >
        <Text style={styles.buttonText}>Go to Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, styles.secondaryButton]}
        onPress={() => router.back()}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space.lg,
    backgroundColor: theme.colors.bg0,
  },
  title: {
    fontSize: 64,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: theme.space.sm,
  },
  subtitle: {
    ...theme.type.displayLarge,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.xs,
  },
  description: {
    ...theme.type.bodyLarge,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.space.xl,
    maxWidth: 300,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.space.sm,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    ...theme.type.labelLarge,
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
  },
});