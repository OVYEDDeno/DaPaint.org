// constants/DaPaintDesign.ts
// Landing-aligned light palette and shared design tokens
import { Platform } from "react-native";

export const DaPaintColors = {
  // Brand Core
  primary: "#2EC4FF",
  primaryDark: "#0A84FF",
  primaryDeep: "#005C82", // anchor blue from landing
  gold: "#FFD166",
  ember: "#FF4D6D",
  aurora: "#7C5CFF",

  // Feedback
  success: "#34C759",
  warning: "#FFCC00",
  error: "#FF453A",
  info: "#2EC4FF",

  // Background + Surfaces (light over landing art)
  bg0: "rgba(255,255,255,0.98)",
  bg1: "rgba(255,255,255,0.95)",
  bg2: "rgba(255,255,255,0.92)",
  surface: "rgba(255,255,255,0.98)",      // More opaque to match button styling
  surfaceStrong: "rgba(255,255,255,0.95)",
  border: "rgba(0,92,130,0.18)",

  // Text
  textPrimary: "#005C82",
  textSecondary: "rgba(0,92,130,0.78)",
  textTertiary: "rgba(0,92,130,0.60)",
  textInverse: "#0B1020",

  // Overlays
  scrim: "rgba(0,0,0,0.35)",
  scrimStrong: "rgba(0,0,0,0.55)",

  // Action colors
  nope: "#FF4D6D",
  like: "#3DFFB5",
  super: "#7C5CFF",
};

export const DaPaintGradients = {
  // Use with expo-linear-gradient
  background: [DaPaintColors.bg0, DaPaintColors.bg2],
  cardScrim: ["rgba(0,0,0,0.0)", "rgba(0,0,0,0.82)"],
  hopefulGlow: ["rgba(46,196,255,0.0)", "rgba(46,196,255,0.25)"],
  premiumGlow: ["rgba(124,92,255,0.0)", "rgba(124,92,255,0.25)"],
  goldGlow: ["rgba(255,209,102,0.0)", "rgba(255,209,102,0.22)"],
};

export const DaPaintTypography = {
  displayXL: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const },
  displayLarge: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
  displayMedium: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const },
  displaySmall: { fontSize: 18, lineHeight: 24, fontWeight: "600" as const },

  bodyLarge: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },

  labelLarge: { fontSize: 16, lineHeight: 22, fontWeight: "700" as const },
  labelMedium: { fontSize: 14, lineHeight: 20, fontWeight: "700" as const },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: "700" as const },
};

export const DaPaintSpacing = {
  xxxs: 4,
  xxs: 8,
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  headerTop: Platform.OS === "ios" ? 28 : 20,
  headerBottom: 16,
};

export const DaPaintRadius = {
  xs: 10,
  sm: 12, // Matches button styling
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const DaPaintShadows = {
  small: Platform.select({
    ios: { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    android: { elevation: 2 },
    web: { boxShadow: "0px 3px 10px rgba(0,0,0,0.22)" },
    default: { boxShadow: "0px 3px 10px rgba(0,0,0,0.22)" },
  }),
  medium: Platform.select({
    ios: { shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 4 },
    web: { boxShadow: "0px 8px 22px rgba(0,0,0,0.28)" },
    default: { boxShadow: "0px 8px 22px rgba(0,0,0,0.28)" },
  }),
  glowPrimary: Platform.select({
    ios: { shadowColor: DaPaintColors.primary, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 6 },
    web: { boxShadow: `0px 10px 28px rgba(46,196,255,0.35)` },
    default: { boxShadow: `0px 10px 28px rgba(46,196,255,0.35)` },
  }),
  glowSuccess: Platform.select({
    ios: { shadowColor: DaPaintColors.success, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 5 },
    web: { boxShadow: `0px 8px 24px rgba(52,199,89,0.3)` },
    default: { boxShadow: `0px 8px 24px rgba(52,199,89,0.3)` },
  }),
  glowError: Platform.select({
    ios: { shadowColor: DaPaintColors.error, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 5 },
    web: { boxShadow: `0px 8px 24px rgba(255,69,58,0.3)` },
    default: { boxShadow: `0px 8px 24px rgba(255,69,58,0.3)` },
  }),
};

// Apple-style spring physics
export const DaPaintPhysics = {
  // Standard spring - smooth and confident
  spring: {
    mass: 1,
    damping: 20,        // Critical damping for smooth stop
    stiffness: 300,     // Snappy but not jarring
  },
  // Gentle spring - elegant transitions
  springGentle: {
    mass: 1,
    damping: 26,        // Overdamped for smooth glide
    stiffness: 200,
  },
  // Bouncy spring - playful interactions
  springBouncy: {
    mass: 1,
    damping: 12,        // Underdamped for subtle bounce
    stiffness: 400,
  },
  // Button press scale (Apple standard)
  pressScale: 0.97,
  // Timing for non-spring animations
  timing: {
    quick: 160,
    normal: 240,
    slow: 360,
  },
  // Easing curves (for CSS/Reanimated)
  easing: {
    // Apple's custom bezier curves
    standard: [0.4, 0.0, 0.2, 1.0],
    decelerate: [0.0, 0.0, 0.2, 1.0],
    accelerate: [0.4, 0.0, 1.0, 1.0],
  }
};

export const DaPaintAnimations = {
  quick: 160,
  normal: 240,
  slow: 360,
  springConfig: { damping: 18, mass: 1, stiffness: 170 },
};

// Reusable button treatments
export const DaPaintButtons = {
  faq: {
    background: "rgba(0,92,130,0.10)",
    border: "rgba(0,92,130,0.30)",
    text: DaPaintColors.primaryDeep,
  },
  primary: {
    background: DaPaintColors.primaryDeep,
    text: "#ffffff",
    shadow: DaPaintShadows.medium,
  },
  secondary: {
    background: "rgba(0,92,130,0.12)",
    border: "rgba(0,92,130,0.25)",
    text: DaPaintColors.primaryDeep,
    shadow: DaPaintShadows.small,
  },
};

// Date picker theming (for @react-native-community/datetimepicker)
export const DaPaintDatePickerTheme = {
  textColor: DaPaintColors.textPrimary,
  themeVariant: "light" as const,
};