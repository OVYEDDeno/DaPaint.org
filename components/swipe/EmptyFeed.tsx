// components/swipe/EmptyFeed.tsx — CINEMATIC EMPTY v1 (theme tokens, no "challenge")
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';

import { theme } from '../../constants/theme';

type EmptyFeedProps = {
  userWinstreak: number;
  userZipcode: string;
  onCreateDaPaint: () => void;
  onFeelingLucky: () => void;
  isExploreEmpty?: boolean;
};

export default function EmptyFeed({
  userWinstreak,
  userZipcode,
  onCreateDaPaint,
  onFeelingLucky,
  isExploreEmpty,
}: EmptyFeedProps) {
  const bounce = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -10,
          duration: 900,
          useNativeDriver,
        }),
        Animated.timing(bounce, { toValue: 0, duration: 900, useNativeDriver }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.content, { transform: [{ translateY: bounce }] }]}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.emoji}>🎯</Text>
        </View>

        {/* Different content based on isExploreEmpty */}
        {isExploreEmpty ? (
          <>
            <Text style={styles.title}>No DaPaints found!</Text>
            <Text style={styles.subtitle}>
              Winstreak {userWinstreak} • Zip {userZipcode}
            </Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                No DaPaints available in other areas. Try again later or create
                your own!
              </Text>
            </View>
          </>
        ) : (
          <>
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
          </>
        )}

        {isExploreEmpty ? (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
            onPress={onCreateDaPaint}
          >
            <Text style={styles.primaryText}>Create a DaPaint</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
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
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryPressed,
              ]}
              onPress={onFeelingLucky}
            >
              <Text style={styles.secondaryText}>I’m feeling lucky 🎲</Text>
            </Pressable>
            <Text style={styles.hint}>(Browse same winstreak elsewhere)</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: 0,
    top: -40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: theme.space.lg,
    width: '100%',
  },
  dividerLine: {
    backgroundColor: theme.colors.border,
    flex: 1,
    height: 1,
  },

  dividerText: {
    ...theme.type.bodySmall,
    color: theme.colors.textTertiary,
    marginHorizontal: theme.space.sm,
  },
  emoji: { fontSize: 68 },

  hint: {
    ...theme.type.bodySmall,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
    marginTop: theme.space.xxs,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: theme.buttons.faq.background,
    borderColor: theme.buttons.faq.border,
    borderRadius: 60,
    borderWidth: 1,
    height: 120,
    justifyContent: 'center',
    marginBottom: theme.space.lg,
    width: 120,
    ...theme.shadow.glowPrimary,
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.space.sm,
    marginBottom: theme.space.lg,
    padding: theme.space.md,
    width: '100%',
  },

  infoIcon: { fontSize: 22 },
  infoText: {
    flex: 1,
    ...theme.type.bodyMedium,
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },

  primaryBtn: {
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    width: '100%',
    ...theme.shadow.glowPrimary,
  },
  primaryText: {
    ...theme.type.labelLarge,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingVertical: theme.space.sm,
    width: '100%',
  },

  secondaryPressed: {
    backgroundColor: 'rgba(46,196,255,0.08)',
    transform: [{ scale: 0.985 }],
  },
  secondaryText: {
    ...theme.type.labelLarge,
    color: theme.colors.primaryDeep,
  },
  subtitle: {
    ...theme.type.bodyLarge,
    color: theme.colors.textSecondary,
    marginBottom: theme.space.xxl,
    textAlign: 'center',
  },
  title: {
    ...theme.type.displayLarge,
    color: theme.colors.textPrimary,
    marginBottom: theme.space.xs,
    textAlign: 'center',
  },
});
