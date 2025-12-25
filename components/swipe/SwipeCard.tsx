// components/swipe/SwipeCard.tsx - uses host profile pic (users.image_url)
import { View, Text, StyleSheet, Image, Dimensions, Platform, ImageSourcePropType } from "react-native";
import { BlurView } from "expo-blur";
import type { DaPaint } from "../../lib/api/dapaints";
import { theme } from "../../constants/theme";
import { getProfilePicUrl } from "../../lib/profilePics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Fill most of the viewport but leave room for the action bar and tab bar.
const ACTION_BAR_ALLOWANCE = 110; // tighter allowance to keep the card tall
const CARD_HEIGHT = Math.max(SCREEN_HEIGHT - ACTION_BAR_ALLOWANCE, SCREEN_HEIGHT * 0.85);

// Preload the fallback image to avoid loading delays
const FALLBACK_IMAGE = require("../../assets/logo.png");

export default function SwipeCard({ dapaint }: { dapaint: DaPaint }) {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const hostImg = getProfilePicUrl(dapaint.host_image_url);
  const bgSource: ImageSourcePropType = hostImg ? { uri: hostImg } : FALLBACK_IMAGE;

  const price = Number.parseFloat(String(dapaint.ticket_price ?? "0")) || 0;
  const showPrice = price > 0;

  return (
    <BlurView intensity={28} tint="light" style={styles.card}>
      <Image 
        source={bgSource} 
        style={styles.backgroundImage} 
        resizeMode="contain" 
        // Optimize image loading
        defaultSource={FALLBACK_IMAGE}
        onError={() => console.log(`Failed to load image for ${dapaint.host_display_name}`)}
      />

      <View style={styles.topCluster}>
        <View style={styles.hostBadge}>
          <Text style={styles.hostText} numberOfLines={1}>
            {dapaint.host_display_name}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {dapaint.dapaint}
        </Text>
        <Text style={styles.subTitle} numberOfLines={1}>
          🏅 {dapaint.how_winner_is_determined}
        </Text>
      </View>

      {showPrice && (
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>${price.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <View style={styles.pills}>
          <Pill text={`📍 ${dapaint.location}, ${dapaint.city}, ${dapaint.zipcode}`} />
          <Pill text={`🗓 ${formatDate(dapaint.starts_at)} • ${formatTime(dapaint.starts_at)}`} />
          {!!dapaint.rules_of_dapaint && <Pill text={`📜 ${dapaint.rules_of_dapaint}`} />}
        </View>
      </View>
    </BlurView>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    maxWidth: Platform.select({ web: 420, default: SCREEN_WIDTH }),
    height: CARD_HEIGHT,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    borderWidth: 0,
    ...theme.shadow.medium,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    alignSelf: "center",
  },
  topCluster: {
    position: "absolute",
    top: Platform.select({ ios: theme.space.xl, android: theme.space.lg, default: theme.space.lg }),
    left: theme.space.lg,
    right: theme.space.lg,
    alignItems: "center",
    gap: theme.space.xs,
  },
  hostBadge: {
    backgroundColor: theme.colors.surfaceStrong,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.full,
    maxWidth: "90%",
  },
  hostText: {
    ...theme.type.labelMedium,
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  title: {
    ...theme.type.displayLarge,
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  subTitle: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  priceBadge: {
    position: "absolute",
    top: theme.space.lg,
    right: theme.space.lg,
    backgroundColor: theme.colors.gold,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.full,
  },
  priceText: {
    ...theme.type.labelMedium,
    color: theme.colors.textInverse,
  },
  infoContainer: {
    position: "absolute",
    left: theme.space.lg,
    right: theme.space.lg,
    bottom: 160,
    gap: theme.space.sm,
  },
  pills: { gap: theme.space.xs },
  pill: {
    backgroundColor: theme.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.full,
    alignSelf: "flex-start",
    maxWidth: "94%",
  },
  pillText: {
    ...theme.type.bodyMedium,
    color: theme.colors.textSecondary,
  },
});
