// app/(auth)/_layout.tsx
import { Slot } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  root: { flex: 1 },
});
