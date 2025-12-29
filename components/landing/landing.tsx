import React, { useState, useEffect } from 'react';
import { View, Keyboard, Modal, StyleSheet } from 'react-native';
import BackgroundLayer from '../ui/BackgroundLayer';
import { LogoSection } from './LogoSection';
import { HeroTextSection } from './HeroTextSection';
import { TermsSection } from './TermsSection';
import { AuthFormSection } from '../auth/AuthSection';
import { HeroImageSection } from '../auth/HeroImageSection';
import { FAQModal } from '../auth/FAQModal';

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
        <View style={[styles.mainContent, { marginBottom: totalBottomSectionHeight }]}>  
          <HeroTextSection 
            onShowFAQ={() => setShowFAQModal(true)}
          />
        </View>{/* Terms Section - Moved above Auth Form */}
          <View style={[styles.section, styles.termsSection]}>
            <TermsSection />
          </View>

        {/* Fixed Bottom Section */}
        <View style={[styles.absolute, styles.bottomSection]}>
          
          
          {/* Authentication Form Section - SINGLE INSTANCE */}
          {/* Pass keyboardHeight to AuthFormSection so it can pass to UsernameForm */}
          <View style={[styles.section, styles.authSection]}>
            <AuthFormSection
              keyboardHeight={keyboardHeight}
            />
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
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
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
  container: {
    flex: 1,
    backgroundColor: '#CDE6F9',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Background stays at the bottom
  },
  contentContainer: {
    flex: 1,
    zIndex: 1, // Content stays above background
  },
  absolute: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  logoContainer: {
    top: 10,
    alignItems: 'center',
    zIndex: 10, // High z-index to ensure it's visible
    padding: 20,
  },
  mainContent: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: 20,
    zIndex: 5, // Above background
  },
  bottomSection: {
    bottom: 0,
    zIndex: 5, // Same as main content
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100, // Very high z-index to ensure modals are always on top
  },
});
