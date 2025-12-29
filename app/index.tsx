// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Keyboard, StyleSheet } from 'react-native';

import { AuthFormSection } from '../components/auth/AuthSection';
import { HeroImageSection } from '../components/auth/HeroImageSection';
import { HeroSection } from '../components/auth/HeroSection';
import BackgroundLayer from '../components/ui/BackgroundLayer';

export default function Index() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <BackgroundLayer />
      <HeroSection />

      {/* Authentication Form Section - SINGLE INSTANCE */}
      <View style={styles.heroImageSectionAbsolute}>
        <View style={[styles.section, styles.authSection]}>
          <AuthFormSection keyboardHeight={keyboardHeight} />
        </View>
        {/* Hero Image Section - Positioned at bottom */}
        <HeroImageSection />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authSection: {
    marginTop: 20,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  heroImageSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImageSectionAbsolute: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  section: {
    zIndex: 5, // Same as main content
  },
  termsSection: {
    zIndex: 8, // Above main content but below logo
    marginBottom: 20,
  },
});
