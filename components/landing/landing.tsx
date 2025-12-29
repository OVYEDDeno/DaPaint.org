import React, { useState, useEffect } from 'react';
import { View, Keyboard, Modal, StyleSheet } from 'react-native';

import { AuthFormSection } from '../auth/AuthSection';
import { FAQModal } from '../auth/FAQModal';
import { HeroImageSection } from '../auth/HeroImageSection';
import BackgroundLayer from '../ui/BackgroundLayer';

import { HeroTextSection } from './HeroTextSection';
import { LogoSection } from './LogoSection';
import { TermsSection } from './TermsSection';

const totalBottomSectionHeight = 400; // Define the constant

export const LandingPage = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showFAQModal, setShowFAQModal] = useState(false);

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
      {/* Background Layer - Using absolute positioning to ensure it's always in the background */}
      <View style={styles.backgroundContainer}>
        <BackgroundLayer />
      </View>

      {/* Content Container - All content goes here, above the background */}
      <View style={styles.contentContainer}>
        {/* Fixed Logo Section */}
        <View style={[styles.absolute, styles.logoContainer]}>
          <LogoSection />
        </View>

        {/* Main Content Layer */}
        <View
          style={[
            styles.mainContent,
            { marginBottom: totalBottomSectionHeight },
          ]}
        >
          <HeroTextSection onShowFAQ={() => setShowFAQModal(true)} />
        </View>
        {/* Terms Section - Moved above Auth Form */}
        <View style={[styles.section, styles.termsSection]}>
          <TermsSection />
        </View>

        {/* Fixed Bottom Section */}
        <View style={[styles.absolute, styles.bottomSection]}>
          {/* Authentication Form Section - SINGLE INSTANCE */}
          {/* Pass keyboardHeight to AuthFormSection so it can pass to UsernameForm */}
          <View style={[styles.section, styles.authSection]}>
            <AuthFormSection keyboardHeight={keyboardHeight} />
          </View>

          {/* Hero Image Section */}
          <View style={styles.section}>
            <HeroImageSection />
          </View>
        </View>
      </View>

      {/* FAQ Modal */}
      <Modal
        visible={showFAQModal}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowFAQModal(false)}
      >
        <View style={styles.modalContainer}>
          <FAQModal onClose={() => setShowFAQModal(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  absolute: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  authSection: {
    marginTop: 20,
  },
  backgroundContainer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 0, // Background stays at the bottom
  },
  bottomSection: {
    bottom: 0,
    zIndex: 5, // Same as main content
  },
  container: {
    backgroundColor: '#CDE6F9',
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1, // Content stays above background
  },
  logoContainer: {
    top: 10,
    alignItems: 'center',
    zIndex: 10, // High z-index to ensure it's visible
    padding: 20,
  },
  mainContent: {
    backgroundColor: 'transparent',
    flex: 1,
    marginTop: 20,
    zIndex: 5, // Above background
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    zIndex: 100, // Very high z-index to ensure modals are always on top
  },
  section: {
    zIndex: 5, // Same as main content
  },
  termsSection: {
    zIndex: 8, // Above main content but below logo
    marginBottom: 20,
  },
});
