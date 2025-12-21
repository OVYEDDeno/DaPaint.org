import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  Share,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { theme } from "../../constants/theme";

const { width, height } = Dimensions.get("window");

type AdScreenProps = {
  onComplete: () => void;
  onSkip?: () => void;
  username?: string;       // pass from feed userData.display_name
  winstreakGoal?: number;  // default 30
  rewardAmount?: string;   // default "$1,000,000"
};

const mockAd = {
  image:
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1770&q=80",
  brand: "DaPaint",
};

export default function AdScreen({
  onComplete,
  onSkip,
  username,
  winstreakGoal = 30,
  rewardAmount = "$1,000,000",
}: AdScreenProps) {
  const [countdown, setCountdown] = useState(5);

  // subtle entrance
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  const displayName = (username || "I").trim();

  const storyCopy = useMemo(() => {
    // No “challenge” wording.
    return `I, ${displayName}, just accepted DaPaint: ${winstreakGoal} days / ${winstreakGoal} winstreak for ${rewardAmount}.
Think you can stop me from taking it?`;
  }, [displayName, winstreakGoal, rewardAmount]);

  const warningCopy = useMemo(() => {
    return `Important: posting this is required to stay eligible for the ${rewardAmount} reward.
If you don’t post, you may forfeit the reward even if you hit ${winstreakGoal}.`;
  }, [rewardAmount, winstreakGoal]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${storyCopy}\n\n${warningCopy}\n\n#DaPaint`,
      });
    } catch {
      // silent fail (share sheet cancelled etc.)
    }
  }, [storyCopy, warningCopy]);

  return (
    <View style={styles.container}>
      <Image source={{ uri: mockAd.image }} style={styles.image} resizeMode="cover" />

      {/* cinematic overlays */}
      <LinearGradient
        colors={["rgba(0,92,130,0.24)", "rgba(0,92,130,0.12)", "rgba(0,0,0,0.62)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(46,196,255,0.0)", "rgba(46,196,255,0.24)"]}
        style={styles.glowTop}
      />

      <Animated.View style={[styles.topRow, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <View style={styles.brandPill}>
          <Text style={styles.brandText}>{mockAd.brand}</Text>
        </View>

        <View style={styles.countPill}>
          <Text style={styles.countText}>{countdown}</Text>
        </View>
      </Animated.View>

      {/* Bottom “story-worthy” bar */}
      <View style={styles.bottomWrap} pointerEvents="box-none">
        <BlurView intensity={28} tint="light" style={styles.bottomBlur}>
          <LinearGradient
            colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.bottomContent}>
            <Text style={styles.headline}>Post your acceptance</Text>

            <View style={styles.copyCard}>
              <Text style={styles.copyText}>{storyCopy}</Text>
            </View>

            <View style={styles.warningRow}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>{warningCopy}</Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable style={styles.primaryBtn} onPress={handleShare}>
                <Text style={styles.primaryBtnText}>Share</Text>
              </Pressable>

              {onSkip ? (
                <Pressable style={styles.secondaryBtn} onPress={onSkip}>
                  <Text style={styles.secondaryBtnText}>Skip</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.secondaryBtn} onPress={onComplete}>
                  <Text style={styles.secondaryBtnText}>Continue</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.finePrint}>
              By sharing, you confirm you’re the account owner and agree to DaPaint verification rules.
            </Text>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width,
    height,
    backgroundColor: "transparent",
    zIndex: 1000,
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  glowTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },

  topRow: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 28,
    left: theme.space.lg,
    right: theme.space.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandPill: {
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.small,
  },
  brandText: {
    ...theme.type.labelMedium,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  countPill: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  countText: {
    ...theme.type.labelLarge,
    color: theme.colors.textPrimary,
  },

  bottomWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomBlur: {
    paddingTop: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingBottom: Platform.OS === "ios" ? theme.space.xxl : theme.space.lg,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  bottomContent: {
    gap: theme.space.sm,
  },
  headline: {
    ...theme.type.displaySmall,
    color: theme.colors.textPrimary,
  },
  copyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  copyText: {
    ...theme.type.bodyLarge,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  warningRow: {
    flexDirection: "row",
    gap: theme.space.xs,
    alignItems: "flex-start",
  },
  warningIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  warningText: {
    ...theme.type.bodySmall,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: theme.space.sm,
    marginTop: theme.space.xs,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    alignItems: "center",
    ...theme.shadow.glowPrimary,
  },
  primaryBtnText: {
    ...theme.type.labelLarge,
    color: "#ffffff",
  },
  secondaryBtn: {
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.primaryDeep,
    backgroundColor: "rgba(0,92,130,0.08)",
  },
  secondaryBtnText: {
    ...theme.type.labelLarge,
    color: theme.colors.textPrimary,
  },
  finePrint: {
    ...theme.type.bodySmall,
    color: theme.colors.textTertiary,
    marginTop: theme.space.xs,
  },
});


