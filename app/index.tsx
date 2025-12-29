// app/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Keyboard, StyleSheet } from 'react-native';
import BackgroundLayer from '../components/ui/BackgroundLayer';
import { HeroSection } from '../components/auth/HeroSection';
import { HeroImageSection } from '../components/auth/HeroImageSection';
import { AuthFormSection } from '../components/auth/AuthSection';

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
  container: {
    flex: 1,
  },
  section: {
    zIndex: 5, // Same as main content
  },
  termsSection: {
    zIndex: 8, // Above main content but below logo
    marginBottom: 20,
  },
  authSection: {
    marginTop: 20,
  },
  contentContainer: {
    flex: 1,
  },
  heroImageSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heroImageSectionAbsolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
