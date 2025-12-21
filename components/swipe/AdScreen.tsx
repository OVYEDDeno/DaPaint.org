import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { theme } from "../../constants/theme";

const { width, height } = Dimensions.get("window");

export default function AdScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const video = useRef(null);
  const [status, setStatus] = useState({});
  const [canSkip, setCanSkip] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5); // 5 seconds before skip is enabled

  // Calculate dates
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 30);

  // Format dates as "Dec 5" and "Jan 4"
  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const todayFormatted = formatDate(today);
  const futureDateFormatted = formatDate(futureDate);

  useEffect(() => {
    // Enable skip button after 5 seconds
    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(timer);
    };
  }, []);

  const handleContinue = useCallback(() => {
    if (canSkip) {
      onComplete();
    }
  }, [canSkip, onComplete]);

  return (
    <View style={styles.container}>
      <Video
        ref={video}
        style={styles.video}
        source={require("../../assets/One day or day one.mp4")}
        useNativeControls={false}
        resizeMode={ResizeMode.COVER}
        isLooping
        onPlaybackStatusUpdate={(status) => setStatus(() => status)}
        onLoad={() => {
          // Auto-play video when loaded
          if (video.current) {
            video.current.playAsync();
          }
        }}
      />

      {/* Overlay with semi-transparent background */}
      <View style={styles.videoOverlay}>
        {/* Date Text - Top Center */}
        <View style={[styles.dateContainer, { top: theme.space.xxl }]}> 
          <Text style={styles.dateText}>
            {todayFormatted}: Day 1
          </Text>
          <Text style={styles.dateText}>
            {futureDateFormatted}: Day 30 Millionaire
          </Text>
        </View>

        {/* Bottom Content */}
        <View style={styles.bottomContent}>
          {/* Daily Requirement Warning */}
          <Text style={styles.warningText}>
            Win 1 DaPaint daily to reach your goal
          </Text>

          {/* Continue Button */}
          <Pressable 
            style={[
              styles.continueButton, 
              !canSkip && styles.disabledButton
            ]} 
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width,
    height,
    backgroundColor: theme.colors.textInverse,
    zIndex: 1000,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.scrim,
  },
  dateContainer: {
    position: "absolute",
    left: theme.space.lg,
    right: theme.space.lg,
    alignItems: "center",
  },
  dateText: {
    color: theme.colors.surface,
    ...theme.type.displayXL,
    fontFamily: "Anton, system-ui, sans-serif",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    textAlign: "center",
    marginBottom: theme.space.xs,
  },
  bottomContent: {
    position: "absolute",
    bottom: theme.space.xxl,
    left: theme.space.lg,
    right: theme.space.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.space.md,
  },
  warningText: {
    color: theme.colors.surface,
    ...theme.type.labelLarge,
    letterSpacing: -0.3,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    opacity: 0.95,
  },
  continueButton: {
    backgroundColor: theme.colors.primaryDeep,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    alignItems: "center",
    ...theme.shadow.glowPrimary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: theme.colors.surface,
    ...theme.type.labelLarge,
    letterSpacing: -0.4,
  },
});


