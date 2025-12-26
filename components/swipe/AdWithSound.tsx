import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { theme } from "../../constants/theme";
import BackgroundLayer from "../ui/BackgroundLayer";

type AdScreenProps = {
  onComplete: () => void;
};

export default function AdScreen({ onComplete }: AdScreenProps) {
  const [isMuted, setIsMuted] = useState(Platform.OS === "web");

  const player = useVideoPlayer(require("../../assets/One day or day one.mp4"), (player) => {
    player.loop = true;
    
    if (Platform.OS === "web") {
      // On web, must start muted for autoplay to work
      player.muted = true;
      try {
        player.play();
      } catch (error) {
        console.warn(error);
      }
    } else {
      // On mobile, play with sound
      player.muted = isMuted;
      try {
        player.play();
      } catch (error) {
        console.warn(error);
      }
    }
  });

  const [canSkip, setCanSkip] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    player.muted = isMuted;
    if (!isMuted) {
      try {
        player.play();
      } catch (error) {
        console.warn(error);
      }
    }
  }, [isMuted, player]);

  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 30);

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleContinue = useCallback(() => {
    if (canSkip) onComplete();
  }, [canSkip, onComplete]);

  return (
    <View style={styles.container}>
      <BackgroundLayer />

      {/* Video is placed in its own container to handle centering without affecting the UI layer */}
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      </View>

      {/* UI Overlay is now full-screen and independent of the video's width */}
      <View style={styles.uiOverlay}>
        <View style={styles.topContent}>
          <Text style={styles.dateText}>
            {formatDate(today)}: Day 1
          </Text>
          <Text style={styles.dateText}>
            {formatDate(futureDate)}: Day 30 Millionaire
          </Text>
        </View>

        <View style={styles.bottomContent}>
          {Platform.OS === "web" && isMuted && (
            <Pressable
              style={styles.unmuteButton}
              onPress={() => setIsMuted(false)}
            >
              <Text style={styles.unmuteButtonText}>Tap to enable audio</Text>
            </Pressable>
          )}
          <Text style={styles.warningText}>
            Win 1 DaPaint daily to reach your goal
          </Text>
          <Pressable
            style={[styles.continueButton, !canSkip && styles.disabledButton]}
            onPress={handleContinue}
            disabled={!canSkip}
          >
            <Text style={styles.continueButtonText}>
              {canSkip ? 'Lock In DaPaint' : `Skip in ${timeLeft}s`}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  video: {
    height: '100%',
    // On Web, we keep the 9:16 for the video only so it doesn't stretch weirdly
    // On mobile, it fills the width.
    aspectRatio: Platform.OS === 'web' ? 9 / 16 : undefined,
    width: Platform.OS === 'web' ? undefined : '100%',
  },
  uiOverlay: {
    ...StyleSheet.absoluteFillObject,
    // This allows the overlay to be full width regardless of video width
    justifyContent: 'space-between',
    paddingVertical: theme.space.xxl,
    paddingHorizontal: theme.space.lg,
    alignItems: 'center',
    zIndex: 2,
    // Optional: Add a very slight dark tint to the whole screen if text is hard to read
    backgroundColor: 'rgba(0,0,0,0.1)', 
  },
  topContent: {
    marginTop: theme.space.xxl,
    width: '100%',
    alignItems: 'center',
  },
  bottomContent: {
    marginBottom: theme.space.xxl,
    width: '100%',
    alignItems: 'center',
    gap: theme.space.md,
  },
  dateText: {
    color: theme.colors.surface,
    ...theme.type.displayXL,
    fontFamily: Platform.OS === 'web' ? "Anton, sans-serif" : "Anton",
    ...Platform.select({
      web: {
        textShadow: "0px 2px 10px rgba(0, 0, 0, 0.9)",
      },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.9)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
      },
    }),
    textAlign: "center",
  },
  warningText: {
    color: theme.colors.surface,
    ...theme.type.labelLarge,
    textAlign: "center",
    ...Platform.select({
      web: {
        textShadow: "0px 2px 10px rgba(0, 0, 0, 0.9)",
      },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.9)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
      },
    }),
  },
  continueButton: {
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    minWidth: 220,
    alignItems: "center",
    ...theme.shadow.glowPrimary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  unmuteButton: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
  },
  unmuteButtonText: {
    color: theme.colors.surface,
    ...theme.type.labelLarge,
    fontWeight: "700",
  },
  continueButtonText: {
    color: theme.colors.surface,
    ...theme.type.labelLarge,
    fontWeight: '700',
  },
});
