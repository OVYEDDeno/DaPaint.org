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
    alignItems: 'center',
    paddingHorizontal: DaPaintSpacing.md,
    paddingTop: DaPaintSpacing.xxl,
    zIndex: 2,
  },

  headline: {
    ...DaPaintTypography.displayLarge,
    color: DaPaintColors.textPrimary,
    fontWeight: '800' as const,
    lineHeight: 34,
    maxWidth: 390,
    textAlign: 'center',
  },

  logo: {
    height: 40,
    width: 120,
  },

  logoSpacing: {
    height: DaPaintSpacing.xl,
  },

  subline: {
    ...DaPaintTypography.bodyMedium,
    color: DaPaintColors.textSecondary,
    letterSpacing: 0.3,
    marginTop: DaPaintSpacing.xs,
    textAlign: 'center',
  },

  textContainer: {
    alignItems: 'center',
  },
});
