import React from "react";
import { Platform, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function PremiumGlass({ children, style }: Props) {
  // Android blur is weaker; keep a stronger tint fallback
  if (Platform.OS === "android") {
    return (
      <View style={[styles.androidFallback, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={28} tint="dark" style={[styles.iosBlur, style]}>
      <View style={styles.innerBorder}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  iosBlur: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  innerBorder: {
    padding: 18,
    backgroundColor: "rgba(7,10,18,0.35)", // deep premium tint inside the blur
  },
  androidFallback: {
    borderRadius: 22,
    overflow: "hidden",
    padding: 18,
    backgroundColor: "rgba(7,10,18,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
});