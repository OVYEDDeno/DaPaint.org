// app/(auth)/_layout.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Slot } from "expo-router";

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
  root: { flex: 1 },
  content: { flex: 1 },
});
