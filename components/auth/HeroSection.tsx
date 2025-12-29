import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import {
  DaPaintColors,
  DaPaintTypography,
  DaPaintSpacing,
} from '../../constants/DaPaintDesign';

/** 🎬 Daily Hopeful Hero Headlines with sublines */
const HERO_HEADLINES = [
  {
    headline: 'One DaPaint at a time.',
    subline: 'Build a win streak. You lose nothing by trying again.',
  },
//   {
//     headline: 'Your streak can start today.',
//     subline: 'Every try keeps your chance alive.',
//   },
//   {
//     headline: 'You only need one good run.',
//     subline: 'Missed before? Start again without penalty.',
//   },
//   {
//     headline: 'Day One can happen again.',
//     subline: 'Every new DaPaint is a fresh chance.',
//   },
//   {
//     headline: 'Win the next one.',
//     subline: 'Progress resets — not your future.',
//   },
//   {
//     headline: 'Build your win streak.',
//     subline: 'Keep your chance alive.',
//   },
];

interface HeroSectionProps {
  showLogo?: boolean;
}

interface HeroHeadline {
  headline: string;
  subline: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  showLogo = true,
}) => {
  const currentHeadline = useMemo(() => {
    const day = new Date().getDay(); // 0–6
    return HERO_HEADLINES[day % HERO_HEADLINES.length] as HeroHeadline;
  }, []);

  return (
    <View style={styles.container}>
      {showLogo && (
        <>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.logoSpacing} />
        </>
      )}

      <View style={styles.textContainer} accessibilityRole="header">
        <Text style={styles.headline}>{currentHeadline.headline}</Text>
        <Text style={styles.subline}>{currentHeadline.subline}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: DaPaintSpacing.xxl,
    paddingHorizontal: DaPaintSpacing.md,
    alignItems: 'center',
    zIndex: 2,
  },

  logo: {
    width: 120,
    height: 40,
  },

  logoSpacing: {
    height: DaPaintSpacing.xl,
  },

  textContainer: {
    alignItems: 'center',
  },

  headline: {
    ...DaPaintTypography.displayLarge,
    fontWeight: '800' as const,
    color: DaPaintColors.textPrimary,
    lineHeight: 34,
    textAlign: 'center',
    maxWidth: 390,
  },

  subline: {
    ...DaPaintTypography.bodyMedium,
    color: DaPaintColors.textSecondary,
    textAlign: 'center',
    marginTop: DaPaintSpacing.xs,
    letterSpacing: 0.3,
  },
});
