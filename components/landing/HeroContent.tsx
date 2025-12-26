import React from "react";
import { View, Text, Image, StyleSheet, Dimensions, Pressable, Platform } from "react-native";
import { theme } from "../../constants/theme";

const { height } = Dimensions.get("window");

interface HeroContentProps {
  profileImages: (string | null)[];
  onFaqPress?: () => void;
  fallbackEmoji?: string;
}

export default function HeroContent({
  profileImages,
  onFaqPress,
  fallbackEmoji = "\u{1F464}",
}: HeroContentProps) {
  return (
    <>
      {/* Social proof - right below logo */}
      <View style={styles.socialProofContainer}>
        <Text style={styles.socialProofText}>Join 100,000+ Indulgers worldwide</Text>
        <View style={styles.avatarContainer}>
          {profileImages.map((imageUri, idx) => (
            <View key={idx} style={[styles.avatarPlaceholder, styles.avatarHighlight]}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarIcon}>{fallbackEmoji}</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Hero text content - centered with breathing room */}
      <View style={styles.heroTextContainer}>
        <Text style={styles.mainHeadline}>The Fast Way to Earn $1,000,000</Text>
        <Text style={styles.subtitle}>
          Make custom DaPaints. Compete in under 24 hours in 140+ countries.
        </Text>
        <Pressable style={styles.faqButton} onPress={onFaqPress}>
          <Text style={styles.faqButtonText}>FAQ</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Social proof positioned right below logo
  socialProofContainer: {
    position: "absolute",
    top: 100, // Logo height + spacing
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  socialProofText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: "600",
    marginBottom: 12,
  },
  avatarContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    marginLeft: -8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  avatarHighlight: {
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarIcon: {
    fontSize: 18,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  // Hero text centered with breathing room
  heroTextContainer: {
    position: "absolute",
    top: height * 0.22, // Positioned to give breathing room
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 1,
  },
  mainHeadline: {
    fontSize: 36,
    lineHeight: 44,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    ...Platform.select({
      web: {
        textShadow: "0px 1px 2px rgba(0, 0, 0, 0.1)",
      },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.1)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        textShadow: "0px 1px 1px rgba(255, 255, 255, 0.8)",
      },
      default: {
        textShadowColor: "rgba(255, 255, 255, 0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
      },
    }),
  },
  faqButton: {
    backgroundColor: theme.buttons.faq.background,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: theme.buttons.faq.border,
  },
  faqButtonText: {
    fontSize: 16,
    color: theme.buttons.faq.text,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
