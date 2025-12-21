// components/swipe/EmptyFeed.tsx — CINEMATIC EMPTY v1 (theme tokens, no "challenge")
import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { theme } from "../../constants/theme";

type EmptyFeedProps = {
  userWinstreak: number;
  userZipcode: string;
  onCreateDaPaint: () => void;
  onFeelingLucky: () => void;
};

export default function EmptyFeed({
  userWinstreak,
  userZipcode,
  onCreateDaPaint,
  onFeelingLucky,
}: EmptyFeedProps) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -10, duration: 900, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { transform: [{ translateY: bounce }] }]}>
        <View style={styles.iconWrap}>
          <Text style={styles.emoji}>🎯</Text>
        </View>

        <Text style={styles.title}>Nothing in your feed yet</Text>
        <Text style={styles.subtitle}>
          Winstreak {userWinstreak} • Zip {userZipcode}
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            Post a DaPaint and be the one everyone sees first.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={onCreateDaPaint}
        >
          <Text style={styles.primaryText}>Create a DaPaint</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
          onPress={onFeelingLucky}
        >
          <Text style={styles.secondaryText}>I’m feeling lucky 🎲</Text>
        </Pressable>
        <Text style={styles.hint}>(Browse same winstreak elsewhere)</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.space.lg,
    paddingVertical: 0,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.buttons.faq.background,
    borderWidth: 1,
    borderColor: theme.buttons.faq.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.space.lg,
    ...theme.shadow.glowPrimary,
  },
  emoji: { fontSize: 64 },

  title: {
    ...theme.type.displayLarge,
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: theme.space.xs,
  },
  subtitle: {
    ...theme.type.bodyLarge,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: theme.space.xxl,
  },

  infoCard: {
    width: "100%",
    flexDirection: "row",
    gap: theme.space.sm,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    marginBottom: theme.space.lg,
  },
  infoIcon: { fontSize: 22 },
  infoText: {
    flex: 1,
    ...theme.type.bodyMedium,
    color: theme.colors.textPrimary,
  },

  primaryBtn: {
    width: "100%",
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    alignItems: "center",
    ...theme.shadow.glowPrimary,
  },
  primaryText: {
    ...theme.type.labelLarge,
    color: "#FFFFFF",
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },

  divider: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.space.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    ...theme.type.bodySmall,
    color: theme.colors.textTertiary,
    marginHorizontal: theme.space.sm,
  },

  secondaryBtn: {
    width: "100%",
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.primaryDeep,
    backgroundColor: "transparent",
  },
  secondaryText: {
    ...theme.type.labelLarge,
    color: theme.colors.primaryDeep,
  },
  secondaryPressed: {
    backgroundColor: "rgba(46,196,255,0.08)",
    transform: [{ scale: 0.985 }],
  },
  hint: {
    ...theme.type.bodySmall,
    color: theme.colors.textTertiary,
    marginTop: theme.space.xxs,
    fontStyle: "italic",
  },
});
